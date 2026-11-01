/**
 * dsh-finish-sound — host half.
 *
 * The cues play in the browser, so this half registers no service and takes
 * no input. The browser half in `./client` is loaded through the package's
 * `dsh.client` declaration and owns the preferences.
 */

/** Events that get a cue, in preview order. */
export const EVENTS = ["finish", "question"];

/** The plugin needs no host services. */
export const inject = [];

/** @param ctx - host context; the feature lives entirely in the browser half. */
export function apply() {}
