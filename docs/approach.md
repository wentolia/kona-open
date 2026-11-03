# Early design note: a native player

Written before the browser app existed. Kona became a browser application (`web/`) instead; this note is kept as a record of the original constraints and the native option.

## Requirements at the time

- Replace foobar2000 for daily use on Windows.
- No compromise on playback quality: WASAPI (shared and exclusive), ASIO, resampling, EQ and other DSP.
- Only the features that are used regularly; minimal and direct.
- A bookshelf UI (`mock/shelf.html`).

## Principle

Separate the playback engine from the UI completely.

- The engine runs on a real-time thread and is never affected by UI rendering or garbage collection.
- The UI sends commands (play, stop, seek, settings) and receives state (position, metadata).
- The UI technology can then be chosen freely; the HTML/CSS mock can be reused almost as is.

```
[UI (WebView)] ⇄ commands/events ⇄ [Core: library DB, queue] → [Audio engine: decode → DSP → output]
```

## Candidate stacks

| Option | Stack | For | Against |
|---|---|---|---|
| **A. Rust + Tauri (preferred)** | Engine in Rust, UI in a WebView | Reuses the mock. Low memory. Safe real-time code | ASIO needs the SDK at build time. WASAPI exclusive needs low-level work |
| B. C++ + JUCE | Engine and UI in JUCE | Most mature ASIO/WASAPI/DSP | A custom bookshelf UI is costly. GPL or commercial licence |
| C. C# (WinUI/WPF) + BASS | BASS, BASSWASAPI, BASSASIO | Fastest to a working player | BASS is closed source (free for personal use). Limited DSP |
| D. Electron + native add-on | Node with a C++ or Rust add-on | Familiar web stack | Heavy for an always-running player |

## Parts for option A (Rust)

| Function | Crate or method | Notes |
|---|---|---|
| Decoding | `symphonia` | FLAC, ALAC, WAV, MP3, AAC, Vorbis. Opus and DSD separately |
| Tags | `lofty` | Includes embedded cover art |
| Output: WASAPI shared | `cpal` | Simple |
| Output: WASAPI exclusive | `wasapi` crate directly | For bit-perfect playback; `cpal` lacks exclusive mode |
| Output: ASIO | `cpal` with the `asio` feature | Requires the Steinberg ASIO SDK |
| Resampling | `rubato` (or libsoxr bindings) | High-quality sinc |
| EQ | Own biquads (parametric) | Easy to load AutoEQ presets |
| Gain | ReplayGain tags with clipping protection | |
| Library | SQLite (`rusqlite`) and folder watching (`notify`) | Also play counts and last-played time for face-out display |

## Scope draft

- In: gapless playback, ReplayGain, output device and mode selection, resampler, parametric EQ, volume (digital or bypass).
- Later: crossfeed, convolver, native DSD, plug-ins (VST).
- Probably out: tag editing, conversion, streaming.

## Plan at the time

1. Settle the concept with the UI mock.
2. Minimal engine: a CLI that plays FLAC bit-perfect over WASAPI exclusive.
3. Put it in Tauri and connect the mock UI.
4. Library (folder = shelf) and play history → face-out logic.
5. DSP (resampler, EQ) and ASIO.
