import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/** Load the bundle against `storage`; return a renderer for the settings row as a plain element tree. */
function load(storage) {
	const modules = new Map();
	globalThis.window = { __ModuleLoader__: { load: ({ id, factory }) => modules.set(id, factory) } };
	new Function(readFileSync(new URL("../lib/client.js", import.meta.url), "utf8"))();
	globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
	globalThis.AudioContext = undefined;
	const element = (type, props) => ({ type, props });
	const react = { useState: (value) => [typeof value === "function" ? value() : value, () => {}], useRef: (v) => ({ current: v }), useEffect: () => {} };
	const ui = { Switch: "Switch", Button: "Button" };
	const require = (id) => ({ react, "react/jsx-runtime": { jsx: element, jsxs: element }, "@deepseek-ai/dsh-client-ui-primitives": ui })[id]
		?? (id === "dsh-finish-sound/lib/sounds.js" ? modules.get(id)() : {});
	const plugin = modules.get("dsh-finish-sound")(require);
	let row;
	plugin.apply({
		effect: () => {},
		locale: { register: () => {} },
		slots: { inject: (_, make) => make(), register: (meta, component) => { if (meta.name === "settings.general.item") row = component; } },
	});
	const unwrap = (node) => (typeof node?.type === "function" ? unwrap(node.type(node.props)) : node);
	return () => unwrap(row({ t: (key) => key }));
}

/** First element in the tree matching `test`. */
function find(node, match) {
	if (node === null || typeof node !== "object") return undefined;
	if (match(node)) return node;
	const children = node.props?.children;
	for (const child of Array.isArray(children) ? children : [children]) {
		const hit = find(child, match);
		if (hit) return hit;
	}
	return undefined;
}

test("the volume survives a reload and the off switch", () => {
	const storage = new Map();
	const slider = (tree) => find(tree, (node) => node.type === "input" && node.props.type === "range");
	const toggle = (tree) => find(tree, (node) => node.type === "Switch");
	let render = load(storage);
	slider(render()).props.onChange({ target: { value: "20" } });
	toggle(render()).props.onChange(false);
	render = load(storage);
	const tree = render();
	assert.equal(slider(tree).props.value, 20);
	assert.equal(toggle(tree).props.checked, false);
});
