import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CLIP_PROVENANCE, CLIPS, EVENTS } from "../lib/sounds.js";
import { EVENTS as HOST_EVENTS, inject } from "../lib/index.js";
import { clipFiles } from "../scripts/build-client.mjs";

/** Decode the 44-byte-stripped PCM16 mono WAV inside a data URL. */
function decodeClip(dataUrl) {
	const prefix = "data:audio/wav;base64,";
	assert.ok(dataUrl.startsWith(prefix), "clip is a WAV data URL");
	const bytes = Buffer.from(dataUrl.slice(prefix.length), "base64");
	assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
	assert.equal(bytes.toString("ascii", 8, 12), "WAVE");
	const channels = bytes.readUInt16LE(22);
	const rate = bytes.readUInt32LE(24);
	const bits = bytes.readUInt16LE(34);
	const samples = new Int16Array(bytes.buffer, bytes.byteOffset + 44, (bytes.length - 44) / 2);
	return { channels, rate, bits, samples };
}

test("both events carry a clip", () => {
	assert.deepEqual(EVENTS, ["finish", "question"]);
	for (const event of EVENTS) {
		const { channels, rate, bits, samples } = decodeClip(CLIPS[event]);
		assert.equal(channels, 1, `${event} is mono`);
		assert.equal(rate, 48000, `${event} is 48 kHz`);
		assert.equal(bits, 16, `${event} is PCM16`);
		const seconds = samples.length / rate;
		assert.ok(seconds > 0.3 && seconds < 3, `${event} stays short (${seconds.toFixed(2)} s)`);
		let peak = 0;
		for (const sample of samples) peak = Math.max(peak, Math.abs(sample) / 32768);
		assert.ok(peak > 0.5 && peak <= 0.86, `${event} is mastered under the clip limit (${peak.toFixed(2)})`);
	}
});

test("the two events sound different", () => {
	assert.notEqual(CLIPS.finish, CLIPS.question);
	assert.ok(CLIP_PROVENANCE.finish && CLIP_PROVENANCE.question, "each clip keeps its provenance");
});

test("the catalogue matches assets/", () => {
	assert.deepEqual(clipFiles().map((file) => file.replace(/\.wav$/, "")), EVENTS);
	for (const event of EVENTS) {
		const asset = readFileSync(new URL(`../assets/${event}.wav`, import.meta.url)).toString("base64");
		assert.equal(CLIPS[event], `data:audio/wav;base64,${asset}`, `run \`npm run build\` after changing assets/${event}.wav`);
	}
});

test("host half is a passive entry", () => {
	assert.deepEqual([...HOST_EVENTS], EVENTS);
	assert.deepEqual(inject, []);
});
