import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/** Load the bundle with a minimal React, AudioContext and storage; return the event monitor and a start counter. */
function load(stored) {
	const modules = new Map();
	globalThis.window = { __ModuleLoader__: { load: ({ id, factory }) => modules.set(id, factory) } };
	new Function(readFileSync(new URL("../lib/client.js", import.meta.url), "utf8"))();
	let refs = [];
	let cursor = 0;
	const react = {
		useRef: (value) => (refs[cursor] ??= { current: value }, refs[cursor++]),
		useEffect: (effect) => effect(),
		useState: (value) => [typeof value === "function" ? value() : value, () => {}],
		useMemo: (make) => make(),
	};
	const starts = [];
	globalThis.localStorage = { getItem: () => stored, setItem: () => {} };
	globalThis.fetch = async () => ({ arrayBuffer: async () => new ArrayBuffer(8) });
	globalThis.AudioContext = class {
		state = "running";
		destination = {};
		resume() { return Promise.resolve(); }
		decodeAudioData() { return Promise.resolve({}); }
		createGain() { return { gain: {}, connect: (next) => next }; }
		createBufferSource() { return { connect: (gain) => gain, start: () => starts.push(1) }; }
		close() { return Promise.resolve(); }
	};
	const require = (id) => (id === "react" ? react : id === "dsh-finish-sound/lib/sounds.js" ? modules.get(id)() : {});
	const plugin = modules.get("dsh-finish-sound")(require);
	let monitor;
	plugin.apply({
		effect: () => {},
		locale: { register: () => {} },
		slots: { inject: (_, make) => make(), register: (meta, component) => { if (meta.name === "shell.overlay") monitor = component; } },
	});
	const render = (statuses) => { cursor = 0; monitor({ useSessionStatus: (select) => select(statuses) }); };
	return { render, starts };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
const running = new Map([["s1", { running: true }]]);
const idle = new Map([["s1", { running: false }]]);

test("a finished turn plays the finish cue", async () => {
	const { render, starts } = load(null);
	render(running);
	render(idle);
	await settle();
	assert.equal(starts.length, 1);
});

test("the off switch keeps a finished turn silent", async () => {
	const { render, starts } = load(JSON.stringify({ enabled: false }));
	render(running);
	render(idle);
	await settle();
	assert.equal(starts.length, 0);
});
