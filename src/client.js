// dsh-finish-sound — browser half (client plugin bundle).
//
// Loaded by dsh-client-modules at /plugins/dsh-finish-sound/client.js and
// executed through the vendored cordis Loader's lazy-CJS module table
// (window.__ModuleLoader__.load). The registered id MUST be the package name.
//
// Feature: play a generated cue when a turn finishes and a different cue when
// the agent asks the user something (ask_user_question or an approval). The
// page-wide Session status map carries both facts: a running flag that falls
// marks a finish, and an appearing pending interaction marks a question. The
// clips are small WAV files registered in lib/sounds.js; a row in
// Settings → General turns them on or off for this browser, sets the volume
// and previews either cue.

window.__ModuleLoader__.load({
	id: "dsh-finish-sound",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		let react = require("react");
		// Loaded on first use: the bundle registers its dependency module
		// after this one, and client-modules rejects a registration reached
		// before the module exists.
		const jsxRuntime = () => require("react/jsx-runtime");
		const catalogue = () => require("dsh-finish-sound/lib/sounds.js");
		const jsxWith = (...args) => jsxRuntime().jsx(...args);
		const jsxsWith = (...args) => jsxRuntime().jsxs(...args);
		const primitives = () => require("@deepseek-ai/dsh-client-ui-primitives");

		/** Dictionary namespace owned by this plugin. */
		const NS = "dsh-finish-sound";
		/** Volume until this browser stores its own. */
		const DEFAULTS = { volume: 0.5 };
		const STYLE_ID = "dsh-finish-sound-style";
		const CLASS = "dsh-finish-sound";

		const en = {
			"settings.title": "Event sounds",
			"settings.description": "A cue plays when a turn finishes in any session, and another when the agent asks you something. Applies to this browser.",
			"settings.volume": "Volume",
			"settings.cue.finish": "Finish cue",
			"settings.cue.question": "Question cue",
			"settings.builtin": "Built-in",
			"settings.play": "Play",
			"settings.choose": "Choose file…",
			"settings.reset": "Use built-in",
			"settings.error.size": "Choose a file of 2 MB or less.",
			"settings.error.decode": "This browser cannot play that file.",
			"settings.error.long": "Choose a sound of 10 seconds or less.",
			"settings.error.storage": "This browser could not save the sound.",
		};
		const zh = {
			"settings.title": "事件提示音",
			"settings.description": "任一会话的一轮结束时播放完成音，助手向你提问时播放提问音。仅对此浏览器生效。",
			"settings.volume": "音量",
			"settings.cue.finish": "完成音",
			"settings.cue.question": "提问音",
			"settings.builtin": "内置",
			"settings.play": "播放",
			"settings.choose": "选择文件…",
			"settings.reset": "恢复内置",
			"settings.error.size": "请选择 2 MB 以内的文件。",
			"settings.error.decode": "此浏览器无法播放该文件。",
			"settings.error.long": "请选择 10 秒以内的声音。",
			"settings.error.storage": "此浏览器无法保存该声音。",
		};
		const dict = { en, zh };

		function ensureStyles() {
			if (typeof document === "undefined") return;
			if (document.getElementById(STYLE_ID) !== null) return;
			const style = document.createElement("style");
			style.id = STYLE_ID;
			style.textContent = [
				`.${CLASS}{display:flex;flex-direction:column;gap:12px;padding:16px 0;`,
				`border-bottom:.5px solid var(--dsw-alias-border-l2)}`,
				`.${CLASS}-head{display:flex;align-items:center;gap:8px}`,
				`.${CLASS}-text{display:flex;flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:48px}`,
				`.${CLASS}-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}`,
				`.${CLASS}-desc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}`,
				`.${CLASS}-controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px}`,
				`.${CLASS}-volume{display:flex;flex:1;align-items:center;gap:10px;min-width:200px;`,
				`color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}`,
				`.${CLASS}-volume input{flex:1;min-width:0;accent-color:var(--dsw-alias-brand-primary)}`,
				`.${CLASS}-volume output{min-width:4ch;text-align:right;font-variant-numeric:tabular-nums}`,
				`.${CLASS}[data-enabled=false] .${CLASS}-controls,.${CLASS}[data-enabled=false] .${CLASS}-cues{opacity:.5}`,
				`.${CLASS}-cues{display:flex;flex-direction:column;gap:8px}`,
				`.${CLASS}-cue{display:flex;flex-wrap:wrap;align-items:center;gap:8px}`,
				`.${CLASS}-cue-name{min-width:96px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}`,
				`.${CLASS}-cue-source{flex:1;min-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`,
				`color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}`,
				`.${CLASS}-cue input[type=file]{display:none}`,
				`.${CLASS}-error{margin:0;color:var(--dsw-alias-label-danger,#e5484d);font-size:12px;line-height:18px}`,
			].join("");
			document.head.appendChild(style);
		}

		// -- preferences ------------------------------------------------------

		/** Local storage key for this browser's choice. */
		const PREFS_KEY = "dsh-finish-sound:prefs";

		/** Read the persisted preference object. */
		function readPrefs() {
			try {
				const raw = globalThis.localStorage.getItem(PREFS_KEY);
				const value = raw === null ? null : JSON.parse(raw);
				return typeof value === "object" && value !== null ? value : {};
			} catch {
				return {};
			}
		}

		/** This browser's stored choices over the defaults. */
		function resolvePrefs() {
			const local = readPrefs();
			const volume = typeof local.volume === "number" && local.volume >= 0 && local.volume <= 1 ? local.volume : DEFAULTS.volume;
			return { volume, enabled: local.enabled !== false };
		}

		/** Store one preference field for this browser and refresh the effective preferences. */
		function savePref(key, value) {
			const local = readPrefs();
			local[key] = value;
			try {
				globalThis.localStorage.setItem(PREFS_KEY, JSON.stringify(local));
			} catch {}
			prefs = resolvePrefs();
		}

		/** Effective preferences for this browser. */
		let prefs = resolvePrefs();

		// -- playback ---------------------------------------------------------

		/** One AudioContext for the page lifetime, decoded clips memoized by event. */
		const audio = { ctx: null, clips: new Map() };

		function audioContext() {
			if (audio.ctx === null || audio.ctx.state === "closed") {
				const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
				if (!Ctor) return null;
				audio.ctx = new Ctor();
			}
			return audio.ctx;
		}

		// -- custom clips -----------------------------------------------------

		/** Largest custom file accepted, in bytes. */
		const CUSTOM_LIMIT = 2 * 1024 * 1024;
		/** Longest custom sound accepted, in seconds; bounds the decoded buffer kept in memory. */
		const CUSTOM_SECONDS = 10;
		const DB_NAME = "dsh-finish-sound";
		const DB_STORE = "clips";

		/** Custom clip per event for this browser: `{ name, blob }`. */
		const custom = new Map();
		/** Listeners told when `custom` changes. */
		const customListeners = new Set();

		function openDb() {
			return new Promise((resolve, reject) => {
				const request = globalThis.indexedDB.open(DB_NAME, 1);
				request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
		}

		/** Run one request against the clip store; settles on completion, error or abort (a full quota aborts). */
		function withStore(mode, use) {
			if (!globalThis.indexedDB) return Promise.reject(new Error("IndexedDB is unavailable"));
			return openDb().then((db) => new Promise((resolve, reject) => {
				const fail = (error) => { db.close(); reject(error ?? new Error("IndexedDB transaction aborted")); };
				try {
					const tx = db.transaction(DB_STORE, mode);
					const request = use(tx.objectStore(DB_STORE));
					tx.oncomplete = () => { db.close(); resolve(request.result); };
					tx.onerror = () => fail(tx.error);
					tx.onabort = () => fail(tx.error);
				} catch (error) {
					fail(error);
				}
			}));
		}

		function customChanged(event) {
			audio.clips.delete(event);
			for (const listener of customListeners) listener();
		}

		/** Load every stored custom clip into memory. */
		function loadCustom() {
			if (!globalThis.indexedDB) return Promise.resolve();
			return Promise.all(catalogue().EVENTS.map((event) =>
				withStore("readonly", (store) => store.get(event)).then((value) => {
					if (value && value.blob) {
						custom.set(event, value);
						customChanged(event);
					}
				})
			)).catch((error) => console.error("[dsh-finish-sound] custom clips unavailable:", error));
		}

		/** Latest pick per event; an older pick that finishes later is dropped. */
		const picks = new Map();

		/**
		 * Store a file as one event's cue after checking its size, that it decodes and its length.
		 * The bytes are copied, so editing or deleting the file afterwards changes nothing.
		 * @returns the dictionary key of the problem, null when stored, or "stale" when a newer pick replaced it.
		 */
		async function setCustom(event, file) {
			if (file.size > CUSTOM_LIMIT) return "settings.error.size";
			const pick = (picks.get(event) ?? 0) + 1;
			picks.set(event, pick);
			let bytes;
			let buffer = null;
			try {
				bytes = await file.arrayBuffer();
				const sfx = audioContext();
				if (sfx !== null) buffer = await sfx.decodeAudioData(bytes.slice(0));
			} catch {
				return "settings.error.decode";
			}
			if (buffer !== null && buffer.duration > CUSTOM_SECONDS) return "settings.error.long";
			if (picks.get(event) !== pick) return "stale";
			const value = { name: file.name, blob: new Blob([bytes], { type: file.type }) };
			try {
				await withStore("readwrite", (store) => store.put(value, event));
			} catch {
				return "settings.error.storage";
			}
			if (picks.get(event) !== pick) return "stale";
			custom.set(event, value);
			customChanged(event);
			if (buffer !== null) audio.clips.set(event, Promise.resolve(buffer));
			return null;
		}

		/**
		 * Return one event to its built-in cue.
		 * @returns the dictionary key of the problem, or null.
		 */
		async function clearCustom(event) {
			picks.set(event, (picks.get(event) ?? 0) + 1);
			try {
				await withStore("readwrite", (store) => store.delete(event));
			} catch {
				return "settings.error.storage";
			}
			custom.delete(event);
			customChanged(event);
			return null;
		}

		/** Decode one event's clip once: this browser's custom file, else the built-in data URL. */
		function clipFor(sfx, event) {
			const cached = audio.clips.get(event);
			if (cached !== undefined) return cached;
			const own = custom.get(event);
			const bytes = own
				? own.blob.arrayBuffer()
				: fetch(catalogue().CLIPS[event]).then((response) => response.arrayBuffer());
			const decoded = bytes.then((data) => sfx.decodeAudioData(data));
			audio.clips.set(event, decoded);
			decoded.catch(() => {
				if (audio.clips.get(event) === decoded) audio.clips.delete(event);
			});
			return decoded;
		}

		/** Cue held back while the AudioContext is suspended. */
		let pending = null;

		/** Start a decoded clip on the shared context. */
		function start(buffer, volume) {
			const sfx = audioContext();
			if (sfx === null || sfx.state !== "running") return false;
			const source = sfx.createBufferSource();
			source.buffer = buffer;
			const gain = sfx.createGain();
			gain.gain.value = volume;
			source.connect(gain).connect(sfx.destination);
			source.start();
			return true;
		}

		/**
		 * Play one event's clip, or hold it for the next user gesture when the
		 * browser has not unlocked audio yet.
		 * @param event - catalogue event name ("finish" or "question").
		 * @param volume - linear gain; defaults to the effective volume.
		 */
		function play(event, volume = prefs.volume) {
			if (volume <= 0) return;
			const sfx = audioContext();
			if (sfx === null) return;
			const resume = sfx.state === "running" ? Promise.resolve() : sfx.resume().catch(() => {});
			Promise.resolve(resume)
				.then(() => clipFor(sfx, event))
				.then((buffer) => {
					pending = { event, volume };
					if (start(buffer, volume)) pending = null;
				})
				.catch((error) => {
					console.error("[dsh-finish-sound] clip failed:", error);
				});
		}

		/**
		 * Retry the held cue once audio is available.
		 * @param stale - drop the held cue instead of playing it.
		 */
		function retryPending(stale) {
			if (pending === null) return;
			const held = pending;
			pending = null;
			if (stale) return;
			play(held.event, held.volume);
		}

		function onGesture() {
			retryPending(false);
		}

		/** Pre-decode both clips so the first event does not pay the decode. */
		function warmClips() {
			const sfx = audioContext();
			if (sfx === null) return;
			for (const event of catalogue().EVENTS) clipFor(sfx, event).catch(() => {});
		}

		// -- settings row -----------------------------------------------------

		/** Playback state the settings row renders. */
		function prefState() {
			return { enabled: prefs.enabled, volume: prefs.volume };
		}

		/** Settings → General row: on/off for this browser, volume and cue previews. */
		function SoundSettingsRow(props) {
			const t = props.t;
			const ui = primitives();
			const [state, setState] = react.useState(prefState);
			const [, setRevision] = react.useState(0);
			const [error, setError] = react.useState(null);
			const errors = react.useRef(0);
			const inputs = react.useRef({});
			const report = (problem) => setError(problem === null || problem === "stale" ? null : { key: problem, n: ++errors.current });
			react.useEffect(() => {
				const listener = () => setRevision((value) => value + 1);
				customListeners.add(listener);
				return () => customListeners.delete(listener);
			}, []);

			function setEnabled(enabled) {
				savePref("enabled", enabled);
				setState(prefState());
			}

			function setVolume(volume) {
				savePref("volume", volume);
				setState(prefState());
			}

			async function choose(event, input) {
				const file = input.files && input.files[0];
				input.value = "";
				if (!file) return;
				const problem = await setCustom(event, file);
				report(problem);
				if (problem === null) play(event);
			}

			const cue = (event) => {
				const own = custom.get(event);
				return jsxsWith("div", { className: `${CLASS}-cue`, children: [
					jsxWith("span", { className: `${CLASS}-cue-name`, children: t(`settings.cue.${event}`) }),
					jsxWith("span", { className: `${CLASS}-cue-source`, title: own ? own.name : undefined, children: own ? own.name : t("settings.builtin") }),
					jsxWith(ui.Button, { variant: "outline", size: "sm", onClick: () => play(event), children: t("settings.play") }),
					jsxsWith("span", { children: [
						jsxWith("input", {
							type: "file",
							accept: "audio/*",
							tabIndex: -1,
							"aria-hidden": "true",
							ref: (node) => { inputs.current[event] = node; },
							onChange: (input) => choose(event, input.target),
						}),
						jsxWith(ui.Button, {
							variant: "outline",
							size: "sm",
							onClick: () => inputs.current[event]?.click(),
							children: t("settings.choose"),
						}),
					] }),
					jsxWith(ui.Button, {
						variant: "outline",
						size: "sm",
						disabled: !own,
						onClick: () => {
							report(null);
							clearCustom(event).then(report);
						},
						children: t("settings.reset"),
					}),
				] });
			};

			return jsxsWith("div", {
				className: CLASS,
				"data-enabled": String(state.enabled),
				children: [
					jsxsWith("div", { className: `${CLASS}-head`, children: [
						jsxsWith("div", { className: `${CLASS}-text`, children: [
							jsxWith("div", { className: `${CLASS}-title`, children: t("settings.title") }),
							jsxWith("div", { className: `${CLASS}-desc`, children: t("settings.description") }),
						] }),
						jsxWith(ui.Switch, { checked: state.enabled, label: t("settings.title"), onChange: setEnabled }),
					] }),
					jsxsWith("div", { className: `${CLASS}-controls`, children: [
						jsxsWith("label", { className: `${CLASS}-volume`, children: [
							jsxWith("span", { children: t("settings.volume") }),
							jsxWith("input", {
								type: "range",
								min: 0,
								max: 100,
								step: 5,
								value: Math.round(state.volume * 100),
								onChange: (event) => setVolume(Number(event.target.value) / 100),
								// One sample at the new level when the drag or key press ends.
								onPointerUp: () => play("finish"),
								onKeyUp: () => play("finish"),
							}),
							jsxWith("output", { children: `${Math.round(state.volume * 100)}%` }),
						] }),
					] }),
					jsxsWith("div", { className: `${CLASS}-cues`, children: [
						cue("finish"),
						cue("question"),
						error ? jsxWith("p", { key: error.n, className: `${CLASS}-error`, role: "alert", children: t(error.key) }) : null,
					] }),
				],
			});
		}

		/**
		 * Page-wide event monitor. The status map covers every Session the
		 * client knows; a running flag that falls marks a finish, and a new
		 * pending interaction marks the agent asking something.
		 * @param props - framework kit (useSessionStatus).
		 */
		function FinishMonitor(props) {
			const useSessionStatus = props.useSessionStatus;
			const statuses = typeof useSessionStatus === "function" ? useSessionStatus((value) => value) : null;
			const seen = react.useRef(null);
			react.useEffect(() => {
				const previous = seen.current;
				seen.current = statuses;
				if (previous === null || previous === statuses) return;
				if (statuses === null || typeof statuses.entries !== "function" || typeof previous.get !== "function") return;
				let finished = false;
				let asked = false;
				let running = false;
				try {
					for (const [sessionId, status] of statuses.entries()) {
						const now = status?.running === true;
						if (now) running = true;
						const was = previous.get(sessionId);
						if (was?.running === true && !now) finished = true;
						const question = status?.pendingInteraction?.key;
						if (question !== undefined && question !== null && question !== was?.pendingInteraction?.key) asked = true;
					}
				} catch {
					return;
				}
				if (!prefs.enabled) return;
				// A snapshot that both ends a turn and asks gets the question cue.
				if (asked) play("question");
				else if (finished) play("finish");
				// A new turn started before a held cue could play.
				else if (running && pending !== null) retryPending(true);
			}, [statuses]);
			return null;
		}

		/** Services the plugin body reads from the client root context. */
		exports.inject = ["slots", "locale", "sessions"];

		/**
		 * Plugin body: dictionary, styles, the settings row and the event monitor.
		 * @param ctx - client root context.
		 */
		exports.apply = (ctx) => {
			ctx.effect(() => ctx.locale.register(NS, dict), "finish-sound: dictionaries");
			ctx.effect(() => ensureStyles(), "finish-sound: styles");
			ctx.effect(() => {
				let disposed = false;
				loadCustom().then(() => {
					if (!disposed) warmClips();
				});
				window.addEventListener("pointerdown", onGesture, true);
				window.addEventListener("keydown", onGesture, true);
				return () => {
					disposed = true;
					window.removeEventListener("pointerdown", onGesture, true);
					window.removeEventListener("keydown", onGesture, true);
					if (audio.ctx !== null) audio.ctx.close().catch(() => {});
					audio.ctx = null;
					audio.clips.clear();
				};
			}, "finish-sound: audio");
			ctx.slots.inject("settings.general.item", () =>
				ctx.slots.register({
					name: "settings.general.item",
					id: "finish-sound",
					order: 40,
					locale: NS,
				}, (props) => jsxWith(SoundSettingsRow, { t: props.t }))
			);
			ctx.slots.inject("shell.overlay", () =>
				ctx.slots.register({
					name: "shell.overlay",
					id: "finish-sound-monitor",
					order: 95,
				}, FinishMonitor)
			);
		};

		return module.exports;
	},
});
