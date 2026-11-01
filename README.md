# dsh-finish-sound

DSH Web UI plugin that plays a short cue when a turn finishes, and a different cue when the agent asks you something.

- **Two events, two cues.** A finish cue plays when a turn ends in any session, not only the one on screen. A question cue plays when `ask_user_question` or an approval starts waiting for you. A run of queued turns only rings once, at the end.
- **One setting for every session.** Settings → General → Event sounds turns both cues on or off for this browser, sets the volume and previews either cue.
- **Your own sounds.** Either cue can be replaced with an audio file of up to 2 MB and 10 seconds that the browser can decode (WAV, MP3, OGG, …). The file stays in this browser's IndexedDB; **Use built-in** returns to the shipped clip.
- **Generated clips.** Both cues are WAV files generated with [MOSS-SoundEffect-v2.0](https://huggingface.co/OpenMOSS-Team/MOSS-SoundEffect-v2.0) (Apache-2.0) and ship inside the plugin, so they play offline.

## Cues

| Event | Sound | Clip |
| --- | --- | --- |
| Turn finishes | Two bright marimba notes one step apart | `assets/finish.wav` |
| Agent asks | Two quick bright marimba notes going up, higher and softer than the finish cue | `assets/question.wav` |

Exact prompt and seed for each clip are in `CLIP_PROVENANCE` in [lib/sounds.js](lib/sounds.js).

## Install

Use the DSH plugin manager (Plugins → Add plugin) with the spec:

```
github:mkpoli/dsh-finish-sound
```

Or install from the command line and add the bundle to the profile:

```sh
dsh plugin --profile web add github:mkpoli/dsh-finish-sound
```

Then add `"dsh-finish-sound"` to `dsh.profile.bundles` in `~/.dsh/profiles/web/package.json` and restart `dsh web`. The package ships `cordis.patch.yml`, which inserts the loader entry; the browser half loads through the package's `dsh.client` declaration.

A prebuilt tarball is attached to the release:

```sh
dsh plugin --profile web add https://github.com/mkpoli/dsh-finish-sound/releases/latest/download/dsh-finish-sound.tgz
```

For a local checkout, `link:/path/to/dsh-finish-sound` works the same way.

## Behaviour

- Browsers keep audio locked until the page has had a user gesture. A cue that fires before then plays on the next click or key press unless a new turn has already started.
- A snapshot that ends a turn and asks a question at the same time plays the question cue only.

## Development

```sh
npm test        # clips, generated catalogue, bundle freshness
npm run build   # regenerate lib/sounds.js and lib/client.js from assets/ and src/
```

The browser bundle is generated. Replace a clip in `assets/`, edit `src/client.js`, then run `npm run build`: `lib/sounds.js` embeds each clip as a data URL and `lib/client.js` registers the plugin module and that catalogue in one file, because the client module loader resolves only modules a bundle registered.

The clips were generated locally with MOSS-SoundEffect-v2.0 from the prompts and seeds in `CLIP_PROVENANCE` (the seed goes to the pipeline's `seed` argument), then mastered: 30 Hz high-pass, trim, fades, peak normalization, mono PCM16. The question cue is set to 80% of the finish cue's RMS.

## License

MIT. The clips are model output of an Apache-2.0 model.
