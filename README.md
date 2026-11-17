# La Cosa Nostra

The family's private board: the v54 La Cosa Nostra app (Nino Brown's source and art), running as its own website and reading Boss's Supabase book through one passcode-locked function.

- `docs/` is the published site (GitHub Pages: branch `main`, folder `/docs`).
- `src/` is Nino's v54 source, already patched by `web/build.py patch`.
- `web/` holds Hova's changes: the Supabase adapter, the Sit-Down page, the login gate, icons, build script.
- No picks, money, chat or passcodes live in this repo. All of that stays in Supabase behind the passcode.

Rebuild: `bun build web/main.tsx --outfile docs/app.js --minify --target browser`, then `python3 web/build.py assemble` with `dist` pointed at `docs`.

Maintained by Hova Da God. 🐶🐾💰
