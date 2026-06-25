# Pip-Boy 3000 — Amazfit Balance 2 Watch Face

A Fallout-style **Pip-Boy 3000** watch face for the **Amazfit Balance 2** (480×480 round
display), built as a native ZeppOS app. Bright phosphor-green UI on a dark CRT-scanline
background, with Russian labels (ВРЕМЯ, ВТОРНИК, ККАЛ, ПУЛЬС, РАССТОЯНИЕ, ШАГИ, БАТАРЕЯ,
ТЕМПЕРАТУРА) and an animated Vault Boy.

![Preview](preview.png)

## Features

- **Time** — large hour-over-minute digits, plus a sensor-driven seconds readout.
- **Date** — `DD.MM.YYYY`, drawn per-digit from the time sensor and snugged to the
  background's separator dots.
- **Day of week** — top banner (ВТОРНИК, etc.).
- **Animated Vault Boy** — 8-frame walk cycle (≈200 ms/frame).
- **Activity gauges** — Calories / Pulse / Steps fill by value (`IMG_LEVEL` bound to the
  `CAL` / `HEART` / `STEP` data types).
- **Battery** — `NN%` with the `%` glyph kept inside its box.
- **Weather** — icon + temperature.
- **Status icons** — Bluetooth / alarm / lock.

## Project layout

This is a standard **Zeus** (ZeppOS CLI) source project. Assets live under a per-target
subfolder (`assets/<target>/`); `app.json` declares the build targets and Zeus compiles the
project into the device package.

```
.
├── app.json                     # Zeus manifest: targets.balance2 (Balance 2 platforms, designWidth 480)
├── app.js                       # app entry boilerplate
├── watchface/
│   └── index.js                 # all watch-face logic (widgets, sensors, timers)
├── assets/
│   └── balance2/                # per-target asset folder (matches the target name in app.json)
│       ├── 0000.png …           # background, glyph fonts, Vault Boy frames, gauge sprites (PNG)
│       ├── Preview.png          # app cover (plain PNG — Zeus generates the device TGA at build)
│       ├── transparent.png
│       └── fonts/2Expansiva-bold.ttf
├── preview.png                  # rendered preview for this README
├── docs/                        # architecture, ZeppOS findings, asset map
├── .gitignore                   # ignores build output (dist/, .zeus/, *.zab/.zpk, node_modules/)
└── README.md
```

`appId` is `1742985`, `appName` is `PipBoy3000`, target API `3.0.0` (Balance 2 supports up to
API 4.2). Target device codes: `Lyon` / `LyonWN` / `LyonW` (deviceSource 9568512/13/15).

## Build / package

Build with the [Zeus CLI](https://docs.zepp.com/docs/guides/tools/cli/) (v1.9.x):

```bash
zeus build        # → dist/<appId>-PipBoy3000-<version>-<timestamp>.zab
zeus preview      # live preview (needs the simulator / a paired device)
```

`zeus build` runs the full native toolchain: it bundles the JS (ROLLUP), **compiles it to
QuickJS bytecode** (`index.bin`), and **converts every PNG asset to the native ZeppOS TGA
format** — then packs everything into a `.zab` (which wraps the device `.zpk`). No login is
needed for a local build. The `dist/` output is gitignored.

> The hand-written `watchface/index.js` is in ZeppOS's already-wrapped runtime form (it calls
> `DeviceRuntimeCore.WatchFace(...)`); Zeus accepts and re-compiles it without changes.

## Install

Sideload the built `.zab` (or the inner `.zpk`) onto the Balance 2 — via the Zepp app
(Profile → your watch → Watch faces → add a custom face) or the developer bridge.

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — file roles, the `init_view` →
  `WIDGET_DELEGATE` runtime lifecycle, the update functions, and a full widget inventory
  (type, binding, asset, coordinates).
- **[docs/ZEPPOS-FINDINGS.md](docs/ZEPPOS-FINDINGS.md)** — reusable Balance 2 / ZeppOS lessons
  (symptom → cause → fix): `TEXT_IMG` alignment needs `w`, `IMG_LEVEL` `type`-binding limits,
  why a bad call in `init_view` bricks the whole face, the `getTimeFormat` `0`/`1` gotcha, the
  non-rendering `IMG_DATE`, the TGA cover requirement, and more.
- **[docs/ASSETS.md](docs/ASSETS.md)** — the numbered-PNG asset index map.

## Known on-watch behaviors

- **Distance gauge stays empty.** ZeppOS `DISTANCE` has no `_TARGET` and a `[0,99] km` range,
  so it can't be `type`-bound like a goal metric. It's bound to `type:STEP` so it renders
  without error, but two `IMG_LEVEL` widgets can't share one data type — only the Steps gauge
  actually fills. (A crash-safe dynamic version would compute the level from the distance
  sensor inside the resume/timer callback, wrapped in try/catch — never via a sensor listener
  in `init_view()`, which aborts the whole face.)
- **Temperature & distance units** (°C/°F, km/mi, decimal point) follow the watch's
  locale/unit settings.
- **AM/PM** shows only when the watch is in 12-hour mode; it's hidden in 24-hour mode.
- The **date** is sensor-driven per digit (the native `IMG_DATE` widget did not render on the
  Balance 2).

## Credits

Based on the GTR Pip-Boy 3000 watch face
([amazfitwatchfaces.com/gtr/view/3513](https://amazfitwatchfaces.com/gtr/view/3513)),
converted and adapted to the Amazfit Balance 2 / ZeppOS platform.
