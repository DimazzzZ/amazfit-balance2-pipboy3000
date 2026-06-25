# Architecture

How the Pip-Boy 3000 watch face is put together and how it runs on the Amazfit Balance 2
(ZeppOS, 480×480 round display).

## Files

| File | Role |
|------|------|
| `app.json` | Zeus manifest. `configVersion: v3`, `appType: "watchface"`, unique `appId`, target API **`4.0.0`**, and a `targets.balance2` block with the three Balance 2 platforms (`Lyon`/`LyonWN`/`LyonW`, deviceSource 9568512/13/15), `designWidth: 480`, and `module.watchface.path = "watchface/index"`. `icon`/`cover` point at `Preview.png`. At build time Zeus flattens `targets.balance2` into the top-level `module`/`platforms` form in the device package. |
| `app.js` | Modern `App({...})` entry (lifecycle stubs). Not watch-face-specific. |
| `watchface/index.js` | The whole watch face, as **modern ZeppOS `@zos` source**: a `WatchFace({ build(), onDestroy() })` that creates the widgets. The only file with real logic. |
| `preview.js` | Local static renderer (Node, zero deps) — composites the face to a PNG (no watch needed). See [Preview](#preview). |
| `assets/balance2/` | All images (numbered PNGs + the cover `Preview.png`) and the font, under the per-target subfolder. See [ASSETS.md](ASSETS.md). |

**Build:** `zeus build` bundles the `@zos` source (ROLLUP), compiles it to QuickJS bytecode
(`index.bin`), converts the PNGs to native ZeppOS TGA, and packs a `.zab`/`.zpk` into `dist/`.
Zeus wraps the source in its own runtime bootstrap. (An earlier build fed Zeus the
*editor-exported, pre-wrapped* form and declared API 3.0 → black screen on device; the fix was
re-authoring as `@zos` source — see finding #11 in [ZEPPOS-FINDINGS.md](ZEPPOS-FINDINGS.md).)

## Runtime lifecycle

`watchface/index.js` is a modern `@zos` module:

```js
import * as hmUI from '@zos/ui'
import { Time } from '@zos/sensor'
import { createTimer, stopTimer } from '@zos/timer'

WatchFace({
  build() { /* create every widget; start the date + Vault Boy timers */ },
  updateDate() { /* refresh the per-digit date from the Time sensor */ },
  onDestroy() { /* stop both timers */ },
})
```

`build()` creates every widget once. Most widgets **auto-update from system data** via their
`type: hmUI.data_type.*` binding — no JS needed for time, metrics, gauges, weather, battery, or
day-of-week. Only two things need imperative code (a `createTimer` each), and both are stopped
in `onDestroy()`:

| Driver | What it does |
|--------|--------------|
| `updateDate()` (60 s timer + once at build) | Reads `Time.getDate()/getMonth()/getFullYear()`, zero-pads to `DDMMYYYY`, and sets each of the 8 per-digit date `IMG`s' `SRC` to the matching glyph (`0011`–`0020`). Per-digit (not `IMG_DATE`) keeps the digits pixel-aligned to the baked separator dots. |
| Vault Boy timer (200 ms) | Cycles the Vault Boy `IMG`'s `SRC` through the 8 frames `0057`–`0064`. |

Everything else (`IMG_TIME` hour/minute/second, the metric `TEXT_IMG`s, the gauge `IMG_LEVEL`s,
weather, battery, `IMG_STATUS` icons) is declarative and bound by `data_type`/`system_status`.

## Widget inventory

Coordinates are in the 480-px design space, straight from `watchface/index.js`.

| Element | Widget | `type` / binding | Asset(s) | x, y (w×h) |
|---------|--------|------------------|----------|------------|
| Background | `IMG` | — | `0000` | 0,0 (480×480) |
| Day of week | `IMG_LEVEL` | `WEEK` | `0026`–`0032` | 150,24 |
| Date digits (DD MM YYYY) | 8× `IMG` | sensor-driven | `0011`–`0020` | 82–179, 78 |
| Weather icon | `IMG_LEVEL` | `WEATHER_CURRENT` | `0079`–`0105` (27) | 330,78 |
| Temperature value | `TEXT_IMG` | `WEATHER_CURRENT` | `0011`–`0020`, neg `0021` | 338,78 (56×24), align RIGHT |
| Degree ° | `IMG` | — | `0023` | 394,78 |
| Vault Boy | `IMG` (animated) | 200 ms timer | `0057`–`0064` | 183,130 |
| Time HH / MM / SS | `IMG_TIME` | autonomous | HH·MM `0001`–`0010`; SS `0011`–`0020` | 328,132 / 328,246 / 371,348 |
| Calories | `TEXT_IMG` | `CAL` | `0069`–`0078` | 17,149 (72×24), align RIGHT |
| Pulse | `TEXT_IMG` | `HEART` | `0069`–`0078` | 15,216 (58×24), align RIGHT |
| Distance | `TEXT_IMG` | `DISTANCE` | `0069`–`0078`, dot `0034` | 8,277 (80×24), align RIGHT |
| Steps | `TEXT_IMG` | `STEP` | `0069`–`0078` | 195,369 (96×24), align CENTER_H |
| Calories gauge | `IMG_LEVEL` | `CAL` | `0200`–`0205` | 90,159 (69×15) |
| Pulse gauge | `IMG_LEVEL` | `HEART` | `0206`–`0211` | 73,224 (72×13) |
| Distance gauge | `IMG_LEVEL` | `STEP` ⚠️ | `0212`–`0217` | 90,286 (69×15) |
| Steps gauge | `IMG_LEVEL` | `STEP` | `0218`–`0223` | 194,349 (91×15) |
| Battery value | `TEXT_IMG` | `BATTERY` | `0069`–`0078` | 74,379 (58×24), align RIGHT |
| Battery % | `IMG` | — | `0035` | 132,379 |
| Disconnect / Lock / Alarm | 3× `IMG_STATUS` | `DISCONNECT`/`LOCK`/`CLOCK` | `0054`/`0052`/`0055` | 312/351/405, ~367 |

⚠️ The Distance gauge is bound to `type: STEP` so it renders without error, but it stays empty
on-watch (`DISTANCE` can't be `type`-bound, and two `IMG_LEVEL`s can't share `STEP`). See
[ZEPPOS-FINDINGS.md](ZEPPOS-FINDINGS.md).

## Preview

`node preview.js [out.png]` (default `preview.png`) composites the face to a 480×480 PNG locally
(round-clipped, with mock data) so the layout can be checked **before flashing a watch**. It's a
zero-dependency Node script (built-in `zlib` only — no npm install): it parses the
`hmUI.createWidget(...)` calls in `watchface/index.js` (resolving the named sprite-group
constants) and decodes/encodes the PNGs itself. An approximation of firmware rendering — good
for position/presence, not a substitute for the device on data-driven fields. For a live
preview, `zeus preview` against the Zepp OS Simulator / a paired device.

## Origin

The layout/assets were originally produced by a GTR→Balance 2 converter (`convert_v2.py`, in the
separate `amazfit-gtr-zeppos-converter` repo) from the source GTR Pip-Boy 3000 face, then
hand-tuned over many on-device iterations, and finally **re-authored as modern `@zos` source**
so it builds with `zeus`. The converter is **not** required to build or modify this watch face —
the project here is self-contained ZeppOS source. The durable lessons live in
[ZEPPOS-FINDINGS.md](ZEPPOS-FINDINGS.md).
