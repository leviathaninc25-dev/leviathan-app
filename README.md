# Leviathan Ink — live book (Phase 1)

Same app screens. One shared book on this server.

## Run locally
```
cd leviathan-live
node server.js
```
Open http://localhost:8787

## Deploy (Render / Railway / Fly)
- Root: this folder
- Start command: `node server.js`
- Set `PORT` if the host requires it
- Optional: `SHOP_KEY` (shop secret). Same value in Admin → Studio → Shop key.

After deploy you get a URL like `https://leviathan-book.onrender.com`

Everyone opens THAT url. Do not open the old file if you want one book.

This is not full production: PINs are still in the app, IDs are stored on this server as JSON, Wix payments are not wired yet. Change default pins before clients use it.
