import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/** Session service whose only known subagent child is `c1` under `s1`. */
const sessions = {
	subagentAddress: (id) => (id === "c1" ? { parentSessionId: "s1", childSessionId: "c1", mode: "continuable" } : undefined),
};

/**
 * Load the bundle with a minimal React, AudioContext and storage; return the
 * event monitor and a start counter. `options.sessions` is the Session root
 * service.
 */
function load(stored, options = {}) {
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
	// Call function components now, the way a renderer would.
	const jsx = (type, props) => (typeof type === "function" ? type(props) : { type, props });
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
	const require = (id) => {
		if (id === "react") return react;
		if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
		if (id === "dsh-finish-sound/lib/sounds.js") return modules.get(id)();
		return {};
	};
	const plugin = modules.get("dsh-finish-sound")(require);
	let monitor;
	plugin.apply({
		effect: () => {},
		locale: { register: () => {} },
		sessions: options.sessions,
		slots: { inject: (_, make) => make(), register: (meta, component) => { if (meta.name === "shell.overlay") monitor = component; } },
	});
	const render = (statuses) => {
		cursor = 0;
		monitor({ useSessionStatus: (select) => select(statuses) });
	};
	return { render, starts };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));
const running = new Map([["s1", { running: true }]]);
const idle = new Map([["s1", { running: false }]]);
const childRunning = new Map([["s1", { running: true }], ["c1", { running: true }]]);
const childDone = new Map([["s1", { running: true }], ["c1", { running: false }]]);
const bothIdle = new Map([["s1", { running: false }], ["c1", { running: false }]]);

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

test("a subagent's finished turn stays silent", async () => {
	const { render, starts } = load(null, { sessions });
	render(childRunning);
	render(childDone);
	await settle();
	assert.equal(starts.length, 0);
});

test("a continuable subagent finishing while the parent idles stays silent", async () => {
	const { render, starts } = load(null, { sessions });
	render(new Map([["s1", { running: false }], ["c1", { running: true }]]));
	render(new Map([["s1", { running: false }], ["c1", { running: false }]]));
	await settle();
	assert.equal(starts.length, 0);
});

test("the parent and a subagent finishing in one snapshot ring once", async () => {
	const { render, starts } = load(null, { sessions });
	render(childRunning);
	render(bothIdle);
	await settle();
	assert.equal(starts.length, 1);
});

test("a subagent's question still rings because it waits on you", async () => {
	const { render, starts } = load(null, { sessions });
	const asking = new Map([["s1", { running: true }], ["c1", { running: true, pendingInteraction: { key: "q1" } }]]);
	render(childRunning);
	render(asking);
	await settle();
	assert.equal(starts.length, 1);
});
