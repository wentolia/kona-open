# Kona (browser app)

Vite and TypeScript, no framework. The behaviour of each screen is described in `docs/features.md`.

```
npm ci
npm run dev           # development server
npm run build         # dist/ — the public build: CSP, bundled fonts, THIRD_PARTY_NOTICES.txt
npm run build:single  # dist-single/index.html — one self-contained file for previews (fonts from a CDN)
npm run build:mock    # dist-mock/ — the phone layout with sample albums and simulated playback
```

`npm run build` runs `tsc --noEmit` first. There is no test suite; type checking and a production build are the required checks before a change is merged.

## Conventions

- Text from tags, file names and peers is inserted with `esc()` (`src/dom.ts`) or `textContent`. Never as raw HTML.
- UI strings are written in Japanese and looked up in the English table in `src/i18n.ts` with `t()`. A string missing from the table falls back to Japanese.
- In-app documents live in `src/docs/<lang>/<name>.html` and are rendered by `docs.html`. All four languages (`ja`, `en`, `ko`, `zh`) must be updated together.
- UI CSS uses the spacing, radius and control-size tokens in `docs/design-tokens.md`. Illustration CSS (room, cats, shelves, objects) is exempt.
- Persistent state uses `localStorage` keys prefixed `kona.` and the `kona` IndexedDB database. A loader that meets an older format migrates it in place.
- The public build loads no third-party script. The only exception is the Spotify Web Playback SDK, loaded after the user enters a Spotify Client ID. The CSP is defined in `vite.config.ts`.
- Generated files are not edited by hand: `src/region-map.ts`, `src/region-names.ts` (`scripts/region-map.py`), `src/shelf-lowpoly.css`, `src/room-lowpoly.css`, `src/header-lowpoly.css` (`scripts/*-lowpoly.py`).

## Entry points

| File | Role |
| --- | --- |
| `index.html` → `src/boot.ts` | The app. `boot.ts` only hands a Google or Spotify sign-in result back to the opener when it runs inside the sign-in popup; otherwise it loads `main.ts` |
| `items.html` → `src/gallery.ts` | Catalogue of every room item, including drafts |
| `docs.html` → `src/docs.ts` | In-app documents in four languages |
| `mock-mobile.html` → `src/mock-mobile.ts` | Phone layout mock |
| `public/manifest.webmanifest`, `public/sw.js`, `public/icon*` | Installable app: manifest, service worker (offline shell), icons |

## Source map

### Core

| File | Role |
| --- | --- |
| `main.ts` | Screen assembly: start-up, folder loading, module rendering and resizing, track panel, library, playback flow |
| `player.ts` | Playback graph: two `<audio>` elements → normalisation → EQ → volume → fade. Preloads the next track and swaps at the boundary. Output device, media session. Spotify albums go to an external `Remote` and bypass the graph |
| `library.ts` | Folder scan, tag and cover reading (average colour, aspect ratio), album assembly from cached tags (`cachedAlbums`) |
| `tagcache.ts` | IndexedDB cache of tags, cover thumbnails and waveform shapes. Unchanged files are not read again |
| `store.ts` | Play counts, last-played time, listening log (album and time only) |
| `prefs.ts` | Fine-grained preferences (`kona.prefs`): text size, typeface, motion, crossfade, cats, language |
| `settings.ts`, `settings.css` | Settings page (`#settings`): Room, Modules, Cats, Sound, Other |
| `settings-io.ts` | Export and import of `kona.*` settings as a JSON file |
| `shortcuts.ts` | Fixed keyboard bindings |
| `i18n.ts` | Japanese → English string table |
| `doc-link.ts` | Links to the in-app documents, with the document language |
| `dom.ts` | Shared helpers: `$`, `esc`, `fmt`, `collator` |
| `album-sort.ts` | Album ordering (including by cover colour) and search syntax (`artist:` `tag:` `mood:` …, quoted phrases, `-` to exclude) |
| `libgroup.ts` | Grouping by folder or by artist, shared by the library, shelf dividers and the phone shelves |
| `tags.ts`, `tags.css` | User tags on folders and albums (`kona.tags`) and the album set selected in the header |
| `theme.ts` | Theme colours and their CSS variables |
| `first-run.ts` | Initial room for a browser with no Kona data |
| `fonts.ts`, `fonts-cdn.ts` | Bundled fonts; the CDN variant replaces it in single-file builds |

### Sources

| File | Role |
| --- | --- |
| `drive.ts`, `drive-ui.ts` | Google Drive: the user's own OAuth client ID, read-only scope, token in `sessionStorage`. Folder listing, scanning, fetching, keeping albums on the device |
| `spotify.ts`, `spotify-play.ts`, `spotify-ui.ts` | Spotify: the user's own Client ID with PKCE, token in `localStorage`. Saved albums as Kona albums; playback through the Web Playback SDK, which is loaded only on demand |

### Home and modules

| File | Role |
| --- | --- |
| `layout.ts` | Home layout (rows → columns → stacks) and its editing |
| `modules.ts`, `modctx.ts` | Module dispatch; shared context (player, albums, canvas, per-frame drawing). Equalizer and waveform modules |
| `shelves.ts` | Module kinds, shelf contents (search, Up next, objects only), per-shelf objects (`goods`), migration from older shelf kinds |
| `panes.ts` | Shelf windows: horizontal scrolling of spines, linked panes split by the cover slot or objects, hiding clipped spines |
| `shelf-skin.ts`, `shelf-lowpoly.css` | Shelf material (`<html data-shelf>`) |
| `shelf-marks.ts` | Wear marks on shelf boards: cat hair, rubbing, claw marks (`kona.marks`) |
| `mod-spectrum.ts` | Spectrum: circular or linear, bars or wave, outward, inward or both |
| `mod-clock.ts`, `mod-info.ts`, `mod-log.ts`, `mod-output.ts`, `mod-distance.ts` | Hour chime and hanging clock; library-card album info; weekly listening log; output and layered sounds; listening distance |
| `mod-window.ts`, `window-sky.ts`, `window-scenes.ts`, `window-frame.ts`, `window-bird.ts` | Window module: sky by time of day, scenery, frame matched to the shelf material, visiting birds |
| `mod-objects.ts`, `mod-objects.css` | Objects on shelves (lamp, plant, candle, mug, metronome, clock, certificate frame …) |
| `mod-cat.ts`, `mod-cat.css` | Cat furniture: tower, scratcher, food |
| `eq.ts` | Seven-band equalizer with shelving ends, ±12 dB, automatic preamp |
| `noise.ts` | Layered sounds: three noises, rain, fire, waves, vinyl crackle |
| `modeui.ts` | Play-mode button |
| `mini.ts` | Picture-in-picture player (Document Picture-in-Picture) |
| `ritual.ts`, `ritual.css` | Start-of-album animation: the spine is pulled out and becomes the cover |
| `room-light.ts`, `room-light.css` | Room lighting by time of day, window light and sunbeam |
| `room-surface.ts`, `room-surface.css`, `room-lowpoly.css` | Walls and floors |
| `room-things.ts`, `room-things.css` | Floor and wall items (`kona.things`, up to 60), cat platforms and toys |
| `place-drag.ts`, `size-knob.ts`, `size-knob.css` | Dragging items from Settings into the room; the resize handle |
| `header-icons.ts`, `header.css`, `header-lowpoly.css` | Header buttons and the low-poly header band |

### Cats

| File | Role |
| --- | --- |
| `cat.ts`, `cat.css` | Low-poly cats: walking, jumping, sitting, sleeping, interactions. Also the party cats (`puppetCat`) |
| `cat-coat.ts` | Coat, breed, personality, name; `isCoat` validates stored and imported cats |
| `cat-acc.ts` | Cat accessories |

### Items, presents and achievements

| File | Role |
| --- | --- |
| `items/` | One file per room item. Each exports an `ItemDef` (name, place: floor, wall or shelf, size, category, `art()`); `index.ts` collects them. `draft: true` items appear only in the catalogue. `lowpoly.ts` holds the drawing helpers and `tone()`; `live.ts` drives animation. Cat platforms use `data-cat-plat`, toys `data-cat-toy` |
| `gallery.ts`, `gallery.css` | The catalogue page |
| `presents.ts`, `presents-ui.ts`, `presents.css` | Presents earned by listening (`kona.presents`) and gifts between party members |
| `achievement-list.ts`, `achievements.ts` | Achievements and their reward items (`kona.achstats`) |
| `awards.ts` | Listening-distance milestones and their dates (`kona.awards`) |
| `region.ts`, `region-map.ts`, `region-names.ts` | Regional items. Location is resolved on the device to a prefecture or country code and the coordinates are discarded |

### Phone

| File | Role |
| --- | --- |
| `mobile.ts`, `mobile.css` | Phone layout on narrow touch devices: shelf list, mini player, full-screen now playing, album sheet |

### Listening party

| File | Role |
| --- | --- |
| `party.ts`, `party.css` | Host and guest sessions. The host's post-EQ audio is sent to guests over WebRTC |
| `party-relay.ts` | Signalling over public Nostr relays with encrypted, ephemeral events |
| `party-ice.ts` | ICE settings: STUN and a TURN relay (Metered, Cloudflare or custom) |
| `party-room.ts`, `party-room.css` | The guest room: cats, chat, permissions, album cards, requests |
| `party-home.ts` | Snapshot of the host's home sent to guests and rebuilt on their side |
| `party-mirror.ts` | View-only player that mirrors the host's playback state for the guest's modules |
| `party-voice.ts` | Voice chat routed through the host |

## Storage keys

`localStorage` holds settings and small records under `kona.*` (for example `kona.prefs`, `kona.layout`, `kona.cats`, `kona.things`, `kona.presents`, `kona.party.*`). IndexedDB `kona` holds folder handles (`roots`) and the tag cache. Cache Storage `kona-drive` holds albums kept from Google Drive; `kona-v*` holds the offline app shell. `sessionStorage` holds the Google Drive token. Settings → Other → Data exports and clears them.

## Scripts

`scripts/*.py` generate low-poly CSS and the region map. They need Python 3. `region-map.py` takes the Natural Earth admin-1 (10m) and admin-0 (50m) GeoJSON files as arguments.
