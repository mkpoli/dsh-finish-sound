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
// clips are small WAV files registered in lib/sounds.js; the composer tool
// row holds a speaker toggle that mutes both for this browser.

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

		/** Dictionary namespace owned by this plugin. */
		const NS = "dsh-finish-sound";
		/** Device-local defaults; the loader entry's volume overrides them. */
		const DEFAULTS = { volume: 0.5 };
		const STYLE_ID = "dsh-finish-sound-style";
		const CLASS = "dsh-finish-sound";

		const en = {
			"button.title": "Event sounds",
			"menu.title": "Event sounds",
			"menu.volume": "Volume",
			"menu.hint": "A cue plays when a turn finishes, and another when the agent asks you something.",
			"menu.preview.finish": "Finish cue",
			"menu.preview.question": "Question cue",
		};
		const zh = {
			"button.title": "事件提示音",
			"menu.title": "事件提示音",
			"menu.volume": "音量",
			"menu.hint": "每轮结束时播放完成音，助手提问时播放提问音。",
			"menu.preview.finish": "完成音",
			"menu.preview.question": "提问音",
		};
		const dict = { en, zh };

		function ensureStyles() {
			if (typeof document === "undefined") return;
			if (document.getElementById(STYLE_ID) !== null) return;
			const style = document.createElement("style");
			style.id = STYLE_ID;
			style.textContent = [
				`.${CLASS}{display:inline-flex;align-items:center;justify-content:center;`,
				`box-sizing:border-box;width:28px;height:28px;padding:0;`,
				`border:none;border-radius:var(--dsw-radius-md,6px);`,
				`background:transparent;color:var(--dsw-alias-label-primary,currentColor);`,
				`cursor:pointer;transition:background-color .12s ease;opacity:.55}`,
				`.${CLASS}:hover,.${CLASS}[aria-expanded=true]`,
				`{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));opacity:1}`,
				`.${CLASS}[data-enabled=true]{opacity:1;color:var(--dsw-alias-brand-primary,currentColor)}`,
				`.${CLASS}:focus-visible`,
				`{outline:2px solid var(--dsw-alias-brand-primary,currentColor);outline-offset:1px}`,
				`.${CLASS}-menu{position:fixed;z-index:60;display:flex;flex-direction:column;gap:2px;`,
				`min-width:210px;padding:6px;border-radius:12px;font-size:13px;line-height:1.3;`,
				`background:var(--dsw-alias-bg-layer-2,#26262a);color:var(--dsw-alias-label-primary,#f5f5f5);`,
				`border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.25));`,
				`box-shadow:0 8px 24px rgba(0,0,0,.28);isolation:isolate}`,
				`.${CLASS}-menu-head{display:flex;align-items:center;justify-content:space-between;`,
				`padding:4px 8px 8px;color:var(--dsw-alias-label-secondary,inherit)}`,
				`.${CLASS}-switch{position:relative;flex:none;box-sizing:border-box;width:30px;height:18px;padding:0;`,
				`border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.45));border-radius:999px;`,
				`background:transparent;cursor:pointer;transition:background-color .12s ease,border-color .12s ease}`,
				`.${CLASS}-switch-dot{position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;`,
				`background:var(--dsw-alias-label-secondary,#9a9a9a);transition:transform .12s ease,background-color .12s ease}`,
				`.${CLASS}-switch[aria-checked=true]{background:var(--dsw-alias-brand-primary,#4d6bfe);`,
				`border-color:var(--dsw-alias-brand-primary,#4d6bfe)}`,
				`.${CLASS}-switch[aria-checked=true] .${CLASS}-switch-dot{transform:translateX(12px);background:#fff}`,
				`.${CLASS}-menu [role=menuitem]{display:flex;align-items:center;gap:8px;padding:6px 8px;`,
				`border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary,inherit);`,
				`font:inherit;text-align:left;cursor:pointer}`,
				`.${CLASS}-menu [role=menuitem]:hover`,
				`{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14))}`,
				`.${CLASS}-menu [role=menuitem] svg{flex:none;opacity:.8}`,
				`.${CLASS}-menu hr{margin:4px 0;border:none;border-top:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.2))}`,
				`.${CLASS}-menu-vol{display:grid;gap:2px;padding:4px 8px 8px;`,
				`color:var(--dsw-alias-label-secondary,inherit)}`,
				`.${CLASS}-menu-vol input{width:100%;accent-color:var(--dsw-alias-brand-primary,currentColor)}`,
				`.${CLASS}-menu-hint{margin:0;padding:4px 8px 2px;font-size:12px;`,
				`color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary,inherit))}`,
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

		/** Merge the device opt-out over the default volume. */
		function resolvePrefs() {
			const local = readPrefs();
			return { volume: DEFAULTS.volume, enabled: local.enabled !== false };
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

		/** Decode one event's clip once; the WAV data URL comes from the catalogue module. */
		function clipFor(sfx, event) {
			const cached = audio.clips.get(event);
			if (cached !== undefined) return cached;
			const decoded = fetch(catalogue().CLIPS[event])
				.then((response) => response.arrayBuffer())
				.then((bytes) => sfx.decodeAudioData(bytes));
			audio.clips.set(event, decoded);
			decoded.catch(() => audio.clips.delete(event));
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

		// -- settings menu ----------------------------------------------------

		/** Playback state the settings surface renders. */
		function prefState() {
			return { enabled: prefs.enabled, volume: prefs.volume };
		}

		/** Composer tool-row toggle with a small settings menu. */
		function FinishSound(props) {
			const t = props.t;
			const [open, setOpen] = react.useState(false);
			const [state, setState] = react.useState(prefState);
			const buttonRef = react.useRef(null);
			const menuRef = react.useRef(null);
			const [anchor, setAnchor] = react.useState(null);

			function setEnabled(enabled) {
				const local = readPrefs();
				local.enabled = enabled;
				try {
					globalThis.localStorage.setItem(PREFS_KEY, JSON.stringify(local));
				} catch {}
				prefs = resolvePrefs();
				setState(prefState());
			}

			react.useEffect(() => {
				if (!open) return;
				const onDown = (event) => {
					const target = event.target;
					if (buttonRef.current && buttonRef.current.contains(target)) return;
					if (menuRef.current && menuRef.current.contains(target)) return;
					setOpen(false);
				};
				const onKey = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				document.addEventListener("pointerdown", onDown);
				document.addEventListener("keydown", onKey);
				return () => {
					document.removeEventListener("pointerdown", onDown);
					document.removeEventListener("keydown", onKey);
				};
			}, [open]);

			const toggle = () => {
				if (open) {
					setOpen(false);
					return;
				}
				const rect = buttonRef.current && buttonRef.current.getBoundingClientRect();
				if (rect) setAnchor({ left: rect.left, bottom: rect.top + 4 });
				setOpen(true);
			};

			const preview = (event) => {
				prefs = { ...prefs, enabled: true };
				setState(prefState());
				play(event);
			};

			const menu = open && anchor
				? jsxWith("div", {
					ref: menuRef,
					className: `${CLASS}-menu`,
					role: "menu",
					"aria-label": t("menu.title"),
					style: { left: Math.max(8, anchor.left), bottom: Math.max(8, window.innerHeight - anchor.bottom) },
					children: [
						jsxWith("div", { className: `${CLASS}-menu-head`, children: [
							jsxWith("span", { children: t("menu.title") }),
							jsxWith("button", {
								type: "button",
								role: "menuitemcheckbox",
								"aria-checked": state.enabled,
								"aria-label": t("menu.title"),
								className: `${CLASS}-switch`,
								onClick: () => setEnabled(!state.enabled),
								children: jsxWith("span", { className: `${CLASS}-switch-dot` }),
							}),
						] }),
						jsxWith("button", {
							type: "button",
							role: "menuitem",
							onClick: () => preview("finish"),
							children: [jsxWith(RiseIcon, {}), jsxWith("span", { children: t("menu.preview.finish") })],
						}),
						jsxWith("button", {
							type: "button",
							role: "menuitem",
							onClick: () => preview("question"),
							children: [jsxWith(AskIcon, {}), jsxWith("span", { children: t("menu.preview.question") })],
						}),
						jsxWith("hr", {}),
						jsxWith("label", { className: `${CLASS}-menu-vol`, children: [
							jsxWith("span", { children: `${t("menu.volume")} ${Math.round(state.volume * 100)}%` }),
							jsxWith("input", {
								type: "range",
								min: 0,
								max: 100,
								step: 5,
								value: Math.round(state.volume * 100),
								onChange: (event) => {
									const volume = Number(event.target.value) / 100;
									prefs = { ...prefs, volume };
									setState({ ...state, volume });
									play("finish", volume);
								},
							}),
						] }),
						jsxWith("p", { className: `${CLASS}-menu-hint`, children: t("menu.hint") }),
					],
				})
				: null;

			return jsxWith(react.Fragment, {
				children: [
					jsxWith("button", {
						ref: buttonRef,
						type: "button",
						className: CLASS,
						"aria-label": t("button.title"),
						title: t("button.title"),
						"aria-haspopup": "menu",
						"aria-expanded": open,
						"data-enabled": String(state.enabled),
						onClick: toggle,
						children: jsxWith(Icon, { off: !state.enabled }),
					}),
					menu,
				],
			});
		}

		/** Speaker glyph: `wave` is "weak" (default) or "strong"; `off` adds a slash. */
		function Icon(props) {
			return jsxWith("svg", {
				width: 16,
				height: 16,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": 1.3,
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
				"aria-hidden": "true",
				children: props.off
					? [
						jsxWith("path", { d: "M2.5 6h2l3-2.5v9L4.5 10h-2z" }),
						jsxWith("path", { d: "M10 6.2 13.5 9.8M13.5 6.2 10 9.8" }),
					]
					: [
						jsxWith("path", { d: "M2.5 6h2l3-2.5v9L4.5 10h-2z" }),
						jsxWith("path", { d: "M10 5.4a3.6 3.6 0 0 1 0 5.2" }),
						jsxWith("path", { d: "M12.4 3.2a6.8 6.8 0 0 1 0 9.6" }),
					],
			});
		}

		/** Menu glyph for the finish cue: a rising wave meter. */
		function RiseIcon() {
			return jsxWith("svg", {
				width: 16,
				height: 16,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": 1.4,
				"stroke-linecap": "round",
				"aria-hidden": "true",
				children: [
					jsxWith("path", { d: "M2.5 11v-2M6 11V6.5M9.5 11V4M13 11V2" }),
				],
			});
		}

		/** Menu glyph for the question cue: a question mark. */
		function AskIcon() {
			return jsxWith("svg", {
				width: 16,
				height: 16,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": 1.4,
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
				"aria-hidden": "true",
				children: [
					jsxWith("path", { d: "M5.6 5.8a2.4 2.4 0 1 1 3.3 2.2c-.8.4-.9 1.1-.9 1.7" }),
					jsxWith("path", { d: "M8 12.6v.2" }),
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
		 * Plugin body: dictionary, styles, the composer toggle and the event monitor.
		 * @param ctx - client root context.
		 */
		exports.apply = (ctx) => {
			ctx.effect(() => ctx.locale.register(NS, dict), "finish-sound: dictionaries");
			ctx.effect(() => ensureStyles(), "finish-sound: styles");
			ctx.effect(() => {
				warmClips();
				window.addEventListener("pointerdown", onGesture, true);
				window.addEventListener("keydown", onGesture, true);
				return () => {
					window.removeEventListener("pointerdown", onGesture, true);
					window.removeEventListener("keydown", onGesture, true);
					if (audio.ctx !== null) audio.ctx.close().catch(() => {});
					audio.ctx = null;
					audio.clips.clear();
				};
			}, "finish-sound: audio");
			ctx.slots.inject("conversation.input.right", () =>
				ctx.slots.register({
					name: "conversation.input.right",
					id: "finish-sound",
					order: 10,
					locale: NS,
				}, (props) => jsxWith(FinishSound, { t: props.t }))
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
