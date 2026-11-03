# Kona

A music player for the browser that keeps to the essentials. Albums sit on shelves in a small room; you pick one by its spine and play it.

- Public build: https://wentolia.github.io/kona-open/
- No server and no analytics. Settings, history and the music index stay in the browser.
- Sources: a folder on the device, Google Drive (optional), Spotify (optional, Premium).

## Repository layout

| Path | Contents |
| --- | --- |
| `web/` | The application. Build, layout and conventions: `web/README.md`. Behaviour: `web/docs/features.md` |
| `web/src/docs/` | In-app documents (privacy and terms, Google Drive and Spotify setup) in Japanese, English, Korean and Chinese |
| `mock/shelf.html` | The first shelf UI mock. Open it directly in a browser |
| `docs/approach.md` | Early design note on a native player. Kept for reference; the browser app superseded it |
| `docs/promo/` | Promotional images and the scripts that render them |

## Publishing

Development happens in a private repository. The public repository `wentolia/kona-open` receives each release as a single commit without history. Its GitHub Actions workflow (`.github/workflows/pages.yml`) builds `web/` and deploys it to GitHub Pages. The workflow skips itself in a private repository.

## License

MIT, without warranty. See `LICENSE`.
