# Offline Tamil Translator

A tiny CLI that translates between English and Tamil entirely **on-device**, powered by [Tether's QVAC SDK](https://github.com/tetherto/qvac). It auto-detects which language you typed (by script), loads the matching offline translation model the first time it's needed, and never sends a single byte to a server.

No API key. No usage bill. Nothing you type leaves your machine.

## What it does / which QVAC function it calls

Type English, get Tamil. Type Tamil, get English. It calls QVAC's `loadModel()` to load a [Bergamot](https://browser.mt/) neural machine translation model (`BERGAMOT_EN_TA` / `BERGAMOT_TA_EN`) on demand, and `translate()` to run inference locally.

## Why I built it

Tamil is spoken by tens of millions of people but is poorly served by mainstream translation tools compared to languages like French or Spanish — and most existing tools require a network round trip to a cloud API. This shows that a fully offline, low-resource-language translator can run on ordinary consumer hardware with a small (~20 MB per direction) model.

## Requirements

- Node.js 18+
- ~50 MB free disk (both translation models, downloaded once and cached)

## Install

```bash
git clone https://github.com/Nafree1/qvac-tamil-translator.git
cd qvac-tamil-translator
npm install
```

SDK used: **`@qvac/sdk` `^0.19.1`** (tested against `0.19.1`).

## Run

Interactive mode — type English or Tamil, get the translation back:

```bash
npm start
```

```
Offline Tamil <-> English translator (QVAC SDK, on-device)
Type English or Tamil text and press Enter. Type ":quit" to exit.

> Where is the nearest hospital?
[EN -> TA] -> அருகிலுள்ள மருத்துவமனை எங்கே உள்ளது?

> நன்றி, மிக்க நன்றி
[TA -> EN] -> Thank you very much

> :quit
```

One-shot mode — pass text as an argument:

```bash
node src/index.js "Hello, how are you today?"
```

The first translation in each direction downloads its model (~20 MB) and shows a progress bar; every run after that is instant and fully offline since the model is cached on disk.

## How it works

- `src/index.js` — the whole app. Detects Tamil script (`஀-௿`) vs. Latin script to pick a direction, lazily `loadModel()`s the matching Bergamot model, calls `translate()`, and `unloadModel()`s everything on exit.
- `qvac.config.json` — quiets the SDK's own console logging so the CLI output stays readable.

## License

MIT, see [LICENSE](./LICENSE).
