# Symph

Symph is a web client for listening to music from a [Jellyfin](https://jellyfin.org/) server. It aims for a calm, modern interface that works on desktop and mobile browsers.

## Capabilities

- **Connect to your server** — Sign in with your Jellyfin URL, username, and password. Credentials stay in the browser; playback uses your Jellyfin session.
- **Browse libraries** — Navigate music libraries, drill into folders, and open albums.
- **Search** — Find music from the search screen.
- **Playback** — Queue tracks, play and pause, seek, adjust volume, and use shuffle and repeat modes. A mini player bar keeps controls available while you browse.
- **Progressive web app** — Installable as a PWA (offline caching applies to the app shell and assets; streaming still needs network access to your server).

## Development

Requirements: Node.js (the CI workflow uses Node 22).

```bash
npm ci
npm run dev
```

The dev server runs Vite’s local preview; open the URL it prints in the terminal.

## Build and preview

```bash
npm run build
```

This generates PWA icons, type-checks, and produces a production build in `dist/`.

To preview the production build locally with Wrangler (Cloudflare’s dev server):

```bash
npm run preview
```

## Deployment

- **GitHub Pages** — Pushes to `main` build with `BASE_PATH` set to `/<repository-name>/` so the app resolves assets correctly under GitHub Pages project URLs. Ensure GitHub Pages is enabled for the repository.
- **Cloudflare Workers (static assets)** — `npm run deploy` runs the build and deploys with Wrangler using the project name `symph` (see `wrangler.jsonc`).

For a custom base path (for example when hosting under a subpath), set `BASE_PATH` when building, for example:

```bash
BASE_PATH=/my-app/ npm run build
```
