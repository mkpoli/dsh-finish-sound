import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildCatalogue, buildClient } from "../scripts/build-client.mjs";

test("lib/client.js matches its sources", () => {
	assert.equal(readFileSync(new URL("../lib/client.js", import.meta.url), "utf8"), buildClient(), "run `npm run build`");
});

test("lib/sounds.js carries the clip data", () => {
	assert.equal(readFileSync(new URL("../lib/sounds.js", import.meta.url), "utf8"), buildCatalogue(), "run `npm run build`");
});

test("the bundle registers the plugin module and its catalogue", () => {
	const modules = new Map();
	globalThis.window = { __ModuleLoader__: { load: ({ id, factory }) => modules.set(id, factory) } };
	new Function(readFileSync(new URL("../lib/client.js", import.meta.url), "utf8"))();
	// The plugin module is registered first so client-modules materializes it
	// only after the catalogue module it requires is registered.
	assert.deepEqual([...modules.keys()], ["dsh-finish-sound", "dsh-finish-sound/lib/sounds.js"]);
	const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub });
	const require = (id) => (id === "dsh-finish-sound/lib/sounds.js" ? modules.get(id)() : stub);
	const catalogue = require("dsh-finish-sound/lib/sounds.js");
	assert.deepEqual(catalogue.EVENTS, ["finish", "question"]);
	assert.ok(catalogue.CLIPS.finish.startsWith("data:audio/wav;base64,"));
	const plugin = modules.get("dsh-finish-sound")(require);
	assert.deepEqual(plugin.inject, ["slots", "locale", "sessions"]);
	assert.equal(typeof plugin.apply, "function");
});
