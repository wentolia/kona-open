# Kona: behaviour

This file describes what the app does today. It is the reference for changes: a change in behaviour updates this file in the same pull request.

## Home

- Home and Library switch with a cross-fade (an instant switch when reduced motion is on).
- The layout is a stack of rows. A row holds columns; a column can stack modules vertically. Row height is in pixels; column widths and stack ratios are proportions.
- Dragging a boundary between rows, columns or stacked modules resizes them. Column widths snap lightly to 1/4, 1/3, 1/2 and similar fractions.
- Each module has a name tag in the gap above it, shown on hover. Clicking the tag opens that module in Settings → Modules; dragging it moves the module. Dropped on another module's edge it goes beside, above or below; dropped in the centre it swaps; dropped between rows it starts a new row.
- Modules: Shelf, Now playing, Clock, Spectrum, Equalizer, Waveform, Album card, Listening log, Output, Window, Distance. The clock can also hang on its own. Shelf objects and floor furniture are not modules; they are placed from Settings → Room → Items.
- The screen carries no explanatory text or hints. An empty shelf or an idle module stays empty.
- On reopening, the album that was playing (track and position) and Up next are restored, paused.
- With no saved library, start-up shows only the source picker, then a progress view until the library is loaded.
- The source picker lists only "Folder on this device" unless a Google Drive or Spotify ID has been entered in Settings.
- Tags and covers are cached. Files with the same path, size and modification time are not read again (300 albums: about 3 s → 0.4 s).
- If read permission for the previous folder is still granted, it is read directly. If it has lapsed (Chrome's default), the shelves and room are drawn from the cache without returning to the start screen.
  - The browser asks for permission on the first play or on Rescan. Once granted, the folder is rescanned, cached albums are replaced with real ones and the pressed album plays.
  - Until then nothing can play, so the previous track is not offered and the header shows no track count.
  - Albums whose cover is an image file in the folder show a cached copy, 320 px on the long side.
  - `navigator.storage.persist()` is requested so the browser does not evict the cache.
- When a new album starts, its spine is drawn out of the shelf, turns to show the cover and moves to the Now playing slot. From a face-out cover or the track panel it is lifted and moved.
- A first visit (no `kona.*` data) starts from a prepared room: layout, a cat and shelf objects. Nothing tied to a library is included.

## Settings and theme

- Opened from Settings in the header (`#settings`; on phones from "…" → Settings).
- No setting appears in two places. The exception is Sound (output, equalizer, layered sounds), which is also on its modules so it can be changed without placing them.
- Tabs: Room, Modules, Cats, Sound, Other (no Modules or Cats on phones). Each tab shows common items first and folds the rest under "More".
- **Room**
  - Theme: Lamplight (default), Morning mist, Study, Sunset, Forest, Deep night, Moonlight, Night blossoms, or Custom (background and accent; the background is kept dark).
    - Theme colours are fixed. Change over the day is handled only by Room light, which follows the clock (default) or stays constant.
    - Colours are CSS variables (`--bg` `--panel` `--ink` `--accent` …) and also drive canvas modules. All themes are dark, because the room is drawn as a night room.
  - Shelf material, wall and floor are chosen from swatches. Sofas, rugs and other items can be placed on the floor and resized.
  - Items: catalogue of shelf objects and furniture to drag into the room.
  - Presents: today's presents, received items and accessories, cat slots, the achievement list.
  - Regional items: on or off, current region, received items.
  - More: shelf wear marks, hour chime.
- **Modules**: while this tab is open, clicking a module on Home selects it and does nothing else (dotted outline on hover, accent outline when selected). The panel shows only the selected module's settings. "Add module" adds one and selects it; single-instance modules already placed are disabled.
- **Cats**: per-cat name and breed (changing breed redraws the coat and keeps personality and favourite), call, send home, no cats. Play: a wand toy, or a random album the cat brings. More: night-time zoomies; what happens when a cat brings a favourite album (nothing, or add to Up next).
- **Sound**
  - Output: the default device or a specific device where the browser allows it.
  - Equalizer: on or off, presets (built-in and saved; saved ones have ×). Same state as the module's ‹ › control.
  - Transitions: gapless (default) or crossfade 3, 6 or 10 s. Crossfade applies only within an album; album boundaries are joined exactly, for Up next and the sleep timer.
  - More: layered sounds (three noises, rain, fire, waves, vinyl), volume normalisation (off, per track, per album), save the current EQ curve.
- **Other**
  - Library: loaded folders and their kind, rescan, open another folder, sort order (library boxes and the default for new shelves), grouping (folder or artist).
  - Text and language: text size (small, normal, large, extra large; text-heavy areas only), typeface (Gothic or Mincho), language (日本語, English, 한국어 or 简体中文; the default follows the browser and falls back to English; the page reloads on change).
  - Library details: placeholder for missing covers (colour and title, initial, colour only), automatic rescan on return, motion (system or reduced), albums kept on the device (size, delete) and storage used, forget folder (with confirmation).
  - Data: export and import settings; clear listening history; reset everything (both with confirmation; music files are never touched).
  - Keyboard: the fixed bindings. Space play/pause, Shift+←/→ previous/next track, ←/→ 10 s, ↑/↓ volume, M mute, 1/2/3 Home/Library/Settings, / search.
  - Google Drive and Spotify: enter or remove the ID, sign in or out, choose a Drive folder, copy the Spotify redirect URI.
  - About Kona: version, licence, source, privacy and terms, third-party licences.

## Phone

- On touch devices up to 900 px wide, a phone layout replaces the module grid. A narrow desktop window does not switch. `?mobile=1` / `?mobile=0` force a layout; `?mobile=auto` restores detection (stored on the device).
- Shelves: Up next, Recently played, Often played, then one shelf per subfolder of the chosen folder. Each scrolls sideways.
  - Tapping a spine shows that album in the row's cover slot; tapping the cover opens the album sheet (on Up next, tapping the spine opens it).
  - Long-press adds to or removes from Up next.
- Search covers album, artist, folder, genre, year and track title. Track hits are listed separately.
- Album sheet: play or pause, Up next, keep on device (Drive albums), track list. Closed by swiping down, tapping outside or Back.
- A mini player sits at the bottom; tap or swipe up for full-screen Now playing (cover, seek, previous/next, track list, Up next).
- "…" at the top right: reopen a device folder or Google Drive, switch to the desktop layout.
- Cats and room modules are not shown on phones.

## Sources

### Folder on this device

- Chosen from the start screen or Folders in the header.
- The Folders menu lists loaded folders (× removes one from Kona; files and history stay), and offers Add folder, Rescan, Replace folder, and Google Drive or Spotify when configured.
  - Any number of folders can be added (Chrome, Edge). Paths inside the first folder are kept as is; added folders appear as `Folder name/…`, so play counts and tags of the first folder do not change. A folder cannot be added twice.
  - Folder handles are stored in IndexedDB `kona`, store `roots`. On reopening, every folder whose permission is still granted is read.
- A folder can also be dropped onto the window. In Chrome and Edge it then reopens and can be rescanned.
- Rescan (Folders menu) walks all folders again and applies only added, removed or changed albums. Shelves and playback stay as they are.
  - Returning to Kona from another app triggers the same rescan, at most once a minute, silently if nothing changed.
  - Where the browser supports `FileSystemObserver` (Chrome, Edge), changes appear within seconds. Elsewhere the folder is rescanned every 3 minutes while the page is visible.

### Google Drive

- Uses an OAuth client ID that the user creates in their own Google Cloud project. Kona contains no ID. Setup: the in-app guide.
- Scope `drive.readonly`. The token stays in `sessionStorage` of the tab and expires after about an hour. No refresh token is held.
- Sign-in opens a popup, or redirects the page if the popup is blocked. When the token expires, a notice offers to sign in again.
- The folder is chosen inside Kona with breadcrumbs. It is remembered and offered on the start screen.
- Tags are read from the head of each file (384 KB, then 3 MB, then the whole file if needed) and cached.
- Tracks are fetched before playback, the next one in advance. The last three are kept in memory so waveform and playback do not fetch twice.
- "Keep on device" in the track panel stores an album in Cache Storage for offline listening; "Remove from device" deletes it.
- While visible, a Drive folder is rescanned every 10 minutes.

### Spotify (optional)

- Uses a Client ID the user creates in Spotify for Developers. PKCE, no secret. The token stays in this browser.
- Saved albums appear on a shelf named Spotify. They are read from Spotify each time; track lists and covers are not cached. If Spotify was open last, it opens again.
- Playback uses the Web Playback SDK (Premium, desktop browser). Kona queues the album's tracks; Spotify joins them. At the end, Kona's play mode and Up next decide what follows.
- Spotify audio is DRM-protected and does not pass through Kona's audio graph. EQ, waveform, spectrum, level, normalisation, crossfade, layered sounds and reverb do not apply (EQ and waveform say so). The sleep-timer fade lowers the remote volume.
- Following Spotify's display rules: covers are not cropped (spines and record labels use only the average colour), and the track panel has "Open in Spotify".
- Play counts, history, cats and shelves work as for other albums.

## Shelves

- Three kinds of shelf content:
  - **Albums by search and order.** An empty query means all albums. Orders: title, artist, year (newest or oldest first), play count (face-out shows the top two with counts), recently played, cover colour. Older shelf kinds (often played, recent, folder, artist, mood, hand-picked) are converted to this kind on load.
  - **Up next** (see Playback).
  - **Objects only.** No albums; placed objects fill the board.
  - A shelf whose query is only `tag:name` accepts dropped albums (the tag is added) and drag-outs (the tag is removed). Hand-picked shelves were converted to this, with the shelf name as the tag.
  - The search field is shown only on shelves whose query the user types (not on play-count, recent, colour, tag or field-query shelves).
- Shelf material: pine (default), birch, ebony, stone, moss, snow, all low-poly with knots, nails and brackets. Applies to every shelf, object and furniture board, and the window frame.
- The header band uses the same low-poly style, coloured from the theme. Tabs are hexagonal tags; Invite and Folders are bevelled boards.
- The cover slot sits at a fixed point (left, middle, right) and can be dragged. With a middle slot, the panes on both sides show one continuous row; the slot hides nothing.
- Spines clipped at a pane edge are hidden. Wheel scrolling stops with a spine aligned to the left edge. Scrolling is bounded so no pane is ever empty.
- Non-square covers are fitted inside the square slot without cropping.
- "Separate folders" groups albums by folder with a gap between groups.

## Playback and Up next

- Play mode button (right of the transport; on phones at the top right of Now playing) cycles Normal → Repeat album → Repeat track → Shuffle within album. It is remembered.
  - Next still advances during Repeat track. Shuffle stays within the album and then moves to Up next, which also shuffles.
  - The sleep timer's "end of album" stops even under Repeat album.
- Gapless: the next track (or the first track of the next album) is loaded into a second player and swapped in at the end. A change to Up next reloads it.
  - Tracks the browser cannot play are skipped with a short notice.
  - Browser limits leave about 10 ms at the swap and any encoder padding in MP3.
- Track and album changes are animated: cover and album card fade, titles cross-fade, waveform bars move to the new shape, the record label dissolves to the new cover.
- Click a spine for the track panel; double-click to play.
- Up next holds only albums dragged into it. When the current album ends, playback moves to the album to the right of the one chosen from Up next, or to the first one. Finished albums leave Up next.
- Choosing from any other shelf changes Now playing only; Up next is untouched.
- Dragging an album out of Up next removes it; onto a tag shelf, it also gets that tag.
- Up next's face-out shows the hovered spine and returns to the next album when the pointer leaves.

## Picture-in-picture and system integration

- Picture-in-picture: a small always-on-top player (Document Picture-in-Picture; Chrome and Edge 116+; hidden elsewhere). It can open automatically when the tab is left during playback, if the browser allows it.
- Kona installs as an app from Chrome or Edge and can be pinned to the taskbar, Start or Dock.
- The window title is "Track — Artist · Kona".
- The OS media controls (media keys, Windows media panel, macOS Control Centre, phone lock screen) show title, cover and progress and support play/pause, previous/next, seek and ±10 s.
- The service worker keeps the app shell for offline start. Music is read from the folder as usual.

## Library

- Multi-select: Ctrl/⌘-click one by one, Shift-click a range (also on Home). A bar offers add to or remove from Up next, and hide from library. Dragging one selected album moves all of them. Esc cancels.
- Hide from library: from the track panel for an album, or × on a folder tag for the folder. Files are not deleted. An Undo notice follows. Hidden albums are listed, folded, at the bottom under "Hidden albums" and can be restored one by one or all at once.
- Albums are grouped in boxes by folder; boxes are packed left to right into rows at a constant density and stretched to fill each row.
- The search field stays at the top. It uses the shelf syntax (`artist:` `genre:` `year:` `folder:` `tag:` `mood:`, quoted phrases, leading `-` to exclude). Folders with no match are hidden.
- The bottom bar shows cover, transport and track list.

## Tags and album sets

- Tags can be put on folders and albums. An album's tags are its own plus those of its folder and parent folders.
  - Where: the folder tag in the library (per album when grouped by artist), the track panel, the multi-select bar.
  - A small panel toggles existing tags; typing a name and Enter adds one. Unused tags disappear. Inherited tags are shown dotted and are read-only.
- Header tabs (shown when tags exist) select the album set for Home, Library and the phone shelves. One press: only that tag. Second: everything except it (accent colour). Third: all. Up next is kept and albums outside the set are skipped. Reopening resets to all.
- Search supports `tag:` (`t:`), and a leading `-` negates any term (for example `-tag:private`).
- Tags are not playlists. They change which albums are shown, never track order.

## Modules

- **Equalizer.** Seven bands (60, 150, 400, 1k, 2.4k, 6k, 12k Hz). Click anywhere on a track to move the fader; double-click for 0 dB; arrow keys step 0.5 dB. The preamp drops by the largest boost to prevent clipping. Presets cycle with ‹ name ›: Flat, Bass, Vocal, Bright, Late night, Old record, then saved curves; "Adjusting" when nothing matches. The combined response curve is drawn behind the faders.
- **Waveform.** The whole track in thin bars; played bars are lit. Shapes are cached. Hover shows the time; click seeks.
- **Clock.** A hanging clock module (click toggles digital and analogue). A separate analogue clock is a shelf object. The hour chime (two notes) is in Room → More and sounds only with a clock placed.
- **Album card.** The current album as a library lending card: bibliographic data, track count and length, format, play count, date stamps.
- **Listening log.** One row per week, eight weeks. Albums as small spines, thicker and taller for more plays. Double-click plays.
- **Output.** Output device (where supported) and the current signal chain. Layered sounds: white, pink and brown noise, rain, fire, waves, vinyl crackle, each with its own level. They play only during playback, fade with the music, share its volume and sleep fade, and are excluded from meters and waveform. Double-click a knob for 0. Sounds are synthesised and loop seamlessly over a few seconds to 24 s. Exclusive mode and bit-perfect output are not possible in a browser.
- **Window.** The sky at the current time, with sun and moon on an arc. A wooden casing, wall depth, a modern sliding window (two large panes overlapping in the middle, crescent lock, rails) and a sill where cats sit. Reflections on the glass; at night the room light shows faintly; a thin curtain moves slightly with the music. Outside: drifting clouds, birds by day, two layers of town, a blinking red tower light, windows that light up and go dark. Scenery is chosen from the module's tag.
  - Rain falls while the rain sound is layered in Output (the only rain switch). The sky clouds over, streaks fall outside and drops form on the glass. Onset rate sets the number of drops and loudness their size. Large drops run down, collect small ones and leave trails; when the rain stops they dry slowly.
  - On clear mornings a sparrow may land on the sill, hop, peck and fly off.
- **Distance.** Total listening time converted to groove length (33⅓ rpm, mean radius 11 cm, about 0.38 m/s). A scaled line shows progress to the next landmark (100 m dash, Tokyo Tower, Mt Fuji, marathon, around the Earth …), the last one passed and the distance left. Reaching a landmark records the date and the album playing (`kona.awards`). Clearing history clears these; they are exported only with history.
- **Spectrum.** Circular (low to high around the circle) or linear, bars or wave, outward, inward or both, adjustable circle size. Display only; no position or seek.

## Mood

`mood:` classifies albums by average cover colour into night, quiet, bright, warm and cool. Combined with the cover-colour order it reproduces the former mood shelf.

## Room light

The room's colour follows the time: clear white in the morning, neutral at noon, orange light from the window in the evening, warm lamplight with darker corners at night. With a window module, light from the sky spills from it; on clear days a sunbeam in the window's shape falls into the room, its direction and length set by the sun, with the shadows of the panes, frame and curtain and a faint shaft of light.

## Shelf objects and furniture

- Shelf objects: lamp (click to light), potted plant (sways), candle (flame follows loudness; also the 30-minute sleep timer), mug (steams during playback), metronome (swings with the music), analogue clock, certificate frame (appears after the first landmark) and the items from `src/items/`.
- The plant follows the season and grows with the number of days you listened (from a sprout to full in about 30 days). Flowers in spring, dense in summer, colouring and dropping leaves in autumn, sparse and dull in winter.
- Settings → Room → Items lists objects and furniture. Floor furniture includes cat furniture (tower, box, food, scratcher). Dragging an object onto a shelf places it to the right of the albums, ordered by drop position; on an objects-only shelf it fills the board. Furniture goes to the dropped spot on the floor (a wooden floor is laid if there is none).
- Objects move between shelves by dragging and reorder within a shelf. Dropping onto Settings, or clicking the swatch, puts it away; placed swatches are outlined.
- Hovering shows a resize handle (50–150 %, double-click for 100 %). Size is relative to shelf height; many objects shrink to fit half the shelf width. Sizes are kept in `kona.objects` (`size`) and `kona.things` (`s`).
- Each object exists once (lamp state, candle and plant growth are per room), so it can be on one shelf only.
- Floor items move left/right and in depth (up is further away: smaller, darker, behind). Wall items move freely. Double-click mirrors an item. `kona.things` holds `{ v: 2, items: [{ id, k, x, d?, y?, s?, f? }] }`, at most 60 items; floor items are visible only with a floor laid.
- Wear marks: where cats often sleep, hair in their coat colour catches on the board edge and the front wears lighter; where they often land, fine claw marks appear. Positions are kept per shelf in 48 slots (`kona.marks`) and survive width changes. They can be turned off in Room → More (and are then hidden).

## Cats

- Low-poly cats walk the shelf boards, jump between shelves, sit, lie down and sleep. Mostly they stay still.
- A dark shadow, a thin light rim and faintly glowing eyes keep them visible against spines.
- Legs are articulated and solved by inverse kinematics from paw positions, with real cat proportions: the shoulder blade runs from the withers to the chest and swings with the leg; the hip is high, the knee comes forward to the belly line, the heel is high (digitigrade).
- Jumping: crouch and fix on the target (longer for higher targets; playful cats wiggle), a full-body extension, a ballistic arc with legs reaching, front-paw landing absorbed at elbow and knee. Walking uses the lateral sequence; paws are placed without sliding.
- Click a cat to make it sit and purr. Cats turn toward a nearby pointer. With reduced motion they do not walk or jump.
- Places: shelf boards, the tops of modules (Now playing and the turntable are warm while music plays; clocks are liked too), the window sill, the floor, sofas, armchairs and cushions (curl up on the seat; sofas also have a backrest). Rugs are warm and floor cats lie on them. Each place has a weight; warm spots and the window sill favour sleep.
- Cat furniture: round and wall beds, cube house top and wicker basket for curling up; laundry basket, paper bag and record crate to sit inside with only the head showing; stairs and catwalks to jump between; scratchers (the free one if there are two).
- Toys: yarn ball, mouse, kicker, ball track, spring toy. Playful cats stalk from a distance, wiggle and pounce; calm ones walk over and bat. Yarn, mouse and kicker roll or slide and stay where they stop; the cat chases and bats again, about three times, then grooms. The ball circles its track; the spring wobbles, slightly with the music. Clicking a toy moves it and draws a playful, awake cat. Quiet music means less play.
- Each cat has one favourite album, fixed on first call. It sometimes sleeps in front of that spine, and goes there often, purring first, while that album plays.
- Personality: energy, sleepiness, sociability, playfulness, curiosity, speed and size, random per cat. They set how often it walks and jumps, how long it sleeps, how often it engages other cats and where it goes.
- Cats together: mutual grooming and sleeping close, play-fighting, pestering a sleeping cat (which may chase, play back or ignore), chasing across platforms.
- Rarely, a cat carries a spine of an often-played album to the Up next shelf.
- A called cat runs in from the edge or drops in from above; a cat sent home runs off or jumps down.
- Coat (black, grey, blue-grey, red tabby, dark brown, cream, white, tuxedo; eye colour) is random on call and persists.
- Accessories (collars, bells, scarves, hats …) are drawn on the head; some are free from the start.

## Presents and achievements

- Listening earns wrapped presents: one per 30 minutes of playback and one for the first play of the day, at most five a day (the day changes at 04:00). Only audible playback counts, and only in one tab (Web Locks).
- The content is drawn from a deck of items and cat accessories not yet owned, without repeats until the deck is exhausted. Sometimes it is one more cat slot: 50 % for the second cat, falling linearly to 5 % for the tenth; ten at most. No odds, rarities or expiry are shown.
- Starter items and regional items are not in the deck.
- Presents lie on the Home floor and open when clicked. Received items carry a label: when, what was playing and from whom (`kona.presents`).
- Achievements (54: 2 for parties, 52 others) are counted every second from listening time, albums heard through (every track past half), library, time of day, season, calendar, cats, parties, room and presents (`kona.achstats`). Each unlocks a fixed item outside the deck. The list is in Room → Presents.
- In a party, an owned item can be given to another member, one kind per day; the giver keeps it.

## Regional items

- Off by default. When turned on in Room → Regional items, the browser's location is read at most once a day (on opening and on manual refresh).
- The coordinates are mapped on the device to a prefecture (Japan) or country code with a coarse built-in map and discarded at once. They are neither stored nor sent. The browser or OS may itself use Google or Apple location services.
- Stored: the current region code, seconds listened there (reset when the region changes), received items (item, region, date, whose room).
- 30 minutes of listening in a region brings the next item of that region, in a fixed order.
- In a party, the host may share the region code with guests (off by default, `kona.party.land`). Listening together for 30 minutes brings that region's item, labelled with the host's room. Guests' locations are not used.

## Listening party

- The host's audio after EQ and before volume is sent to guests, who need no copy of the music. Entry: Invite in the header (on phones "…").
  - WebRTC audio: Opus, stereo, 128 kbps, no DTX. Star topology from the host, up to 8 guests. Audio arrives with a short delay.
  - Layered sounds, the chime and cat sounds are not sent. Spotify tracks cannot be sent (guests see a notice).
- Invite links are for people you know; do not post them publicly. The host is responsible for the rights to what is played. Both the opening screen and the invite screen say so.
- Joining: the host opens a party and sends the link; the guest opens it, gives a name and asks to join; the host sees the request and admits or ignores it. Only admitted guests connect.
  - Connection data (SDP) is exchanged through four public Nostr relays (`party-relay.ts`). No Kona server, account or key registration.
  - "Reset link" invalidates the old link; current guests stay.
- Connection settings (`party-ice.ts`): STUN defaults to Google's public server (your IP address reaches Google); it can be changed or emptied. A TURN relay is needed between most home, mobile and office networks. The host chooses Metered, Cloudflare, a custom TURN server or none and enters the credentials; guests connect through the host's relay without setup. "Check connection" tests the relay. Credentials stay in this browser's `localStorage` and are never put in the link or on the relays.
- The guest enters the host's room. The room does not close on Esc or a background click (× or Leave). The guest's own library and playback are detached and silent; the party volume is separate; the output device follows the local setting.
- Room (`party-room.ts`): a copy of the host's home. Each member is a cat. The host can open the shared home and return to the normal view without ending the party.
  - Home snapshot (`party-home.ts`): rows, columns and module order, and the shelf albums (title, artist, year, colour). View only; scrolling or changing a cover affects only that guest's screen. Non-shelf modules are replaced by a "now playing" card, or mirrored view-only (`party-mirror.ts`).
  - Shown albums: with tags, the host picks All, a tag, or all but a tag (default: the header set; changeable later, which resends the snapshot). Albums outside the set appear nowhere: not on shelves, covers, track lists, search, requests or Play. The current track's name and audio still reach guests.
  - Covers are requested as they come into view; the host sends JPEGs of about 160 px (not for Spotify or other external covers). Albums are referred to by opaque ids (`a1` …); folder paths are not sent.
  - The guest's cat is chosen before entering: random, breed, recolour, personality. Its name tag is the guest's name. Stored as `kona.party.cat`.
  - Clicking a shelf or module walks the cat to the nearest platform (trotting if far, jumping along reachable platforms). Positions are exchanged as platform index and fraction of width, so screens of different sizes agree.
  - Gestures: stand, sit, lie down, sleep, swish tail, keep time (beats detected from the received audio, or a slow steady beat), groom, stretch, yawn.
  - Each cat looks at its owner's pointer (sent every 0.1 s). Room cats make no sound and cannot be petted or held.
- Permissions (host): chat, requests and voice, each with a default for everyone and a per-person default, allow or deny. All are denied by default.
- Remove (per person, press twice): sends a notice, closes the connection and refuses that person's requests for the rest of the party. A reloaded page looks like a new person; "Reset link" covers that. Enforcement is on the host, which drops anything a removed or unpermitted guest sends.
- Album cards: clicking a cover or spine shows the cover, title and tracks.
- Requests (with permission): from the card, per track, or by searching in the chat (title or artist, top 20). The request appears in chat for everyone and as "♪ title" in the cat's bubble. The host sees a notice and can play it from chat.
- Chat (with permission): to everyone or to one person. Messages appear in the cat's bubble and the chat window. Direct messages have a dotted border and are shown only to sender and recipient, but pass through the host's device (stated on screen). 200 characters per message.
- Voice (`party-voice.ts`, with permission): routed through the host, which mixes and sends each guest everyone else's voice. Toggle or push-to-talk. Music ducks while someone speaks. The microphone opens only when its owner turns it on. Nothing is recorded.
- Guests can listen, see what is playing, browse the home snapshot, set volume, move and gesture as a cat, chat and request (with permission), and leave. Only the host controls playback.
- Safeguards:
  - The room key (32 random bytes) is only in the link after `#party=`. The fragment is never sent to a server and is removed from the address bar on opening.
  - Relays see only a tag derived from the key with HKDF, AES-GCM ciphertext and a one-time public key. They cannot read connection data (including IP addresses) or names.
  - Events are ephemeral (kind 29391) and not stored by relays. Join keys live only while the page is open.
  - Relays are not trusted: signatures are verified locally, the sender's public key is bound as additional authenticated data, and messages older than two minutes are dropped.
  - The link carries the host's public key; guests accept messages only from the host.
  - No connection without the host admitting it. The waiting list holds at most 8.
  - Guests never connect to each other and do not see each other's IP addresses. Host and guest do see each other's (stated on screen).
  - Received data is checked for shape and size before use and inserted with `esc()` or `textContent` only.
  - Received cats are validated: colours must be colours (they are written into SVG), only known fields are copied, breeds must be known and personality values are clamped.
  - The host relays room messages with the sender's cat id rewritten, so no one can impersonate another cat. Excess traffic is dropped (gaze about 20/s, chat about 2/s; a snapshot request counts as 30 gaze messages). Only the host can change permissions.
  - The public build's CSP allows these four relays and no others.
- For development, `localStorage` `kona.party.relays` can hold an array of relay URLs. The public build's CSP blocks any others.

## Privacy

- No server, no analytics. Network access goes only to Google's API (Drive, when used), Spotify (when used), the Nostr relays, STUN and the chosen TURN relay (party, when used), and GitHub Pages, which serves the site.
- Listening location is not recorded. Location is used only for regional items, as above. The former location module and its records were removed; any left on the device are deleted at start-up.
- The full text is the in-app document "Privacy and terms" (`src/docs/*/privacy.html`). Third-party licences are bundled as `THIRD_PARTY_NOTICES.txt`.
- No third-party script except the Spotify Web Playback SDK when Spotify is configured. The public build is restricted by CSP and bundles its fonts.
- Tags and file names are always rendered as text.
