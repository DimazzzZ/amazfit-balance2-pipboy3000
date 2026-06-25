# Architecture

How the Pip-Boy 3000 watch face is put together and how it runs on the Amazfit Balance 2
(ZeppOS, 480×480 round display).

## Files

| File | Role |
|------|------|
| `app.json` | Zeus manifest. `appType: "watchface"`, unique `appId`, target API `3.0.0`, and a `targets.balance2` block with the three Balance 2 platforms (`Lyon`/`LyonWN`/`LyonW`, deviceSource 9568512/13/15), `designWidth: 480`, and `module.watchface.path = "watchface/index"`. `icon`/`cover` point at `Preview.png`. At build time Zeus flattens `targets.balance2` into the top-level `module`/`platforms` form in the device package. |
| `app.js` | Standard ZeppOS app entry boilerplate (lifecycle stubs). Not watch-face-specific. |
| `watchface/index.js` | All of the watch face: widget creation, sensor wiring, timers, and the per-field update functions. This is the only file with real logic. |
| `assets/balance2/` | All images (numbered PNGs + the cover `Preview.png`) and the font, under the per-target subfolder. See [ASSETS.md](ASSETS.md). |

**Build:** `zeus build` bundles + compiles `watchface/index.js` to QuickJS bytecode
(`index.bin`), converts the PNGs to native ZeppOS TGA, and packs a `.zab`/`.zpk` into `dist/`.
The hand-written `index.js` is already in ZeppOS's wrapped runtime form (it calls
`DeviceRuntimeCore.WatchFace(...)`); Zeus accepts and re-compiles it unchanged.

## Runtime lifecycle

`watchface/index.js` registers a `DeviceRuntimeCore.WatchFace({...})` with three relevant
hooks:

```
build()  →  this.init_view()      // create every widget, once
onInit() / onDestroy()            // log only
```

`init_view()` does two things, in order:

1. **Creates all widgets** — background, date digits, day-of-week, weather icon + temperature,
   Vault Boy, time, seconds, AM/PM, the four metric numbers, the four gauges, battery, and the
   status icons.
2. **Wires runtime behavior** — a TIME-sensor `DAYCHANGE` listener, then defines the update
   functions, then creates a **`WIDGET_DELEGATE`** that owns the timers.

> ⚠️ **Everything after a throwing statement in `init_view()` never runs.** If a widget or
> sensor call throws, the `WIDGET_DELEGATE` is never created, so no timers start and the face
> appears half-dead (frozen Vault Boy, blank date). This actually happened — see
> [ZEPPOS-FINDINGS.md](ZEPPOS-FINDINGS.md). Keep risky calls out of `init_view()`.

### The `WIDGET_DELEGATE` (resume/pause)

```js
hmUI.createWidget(hmUI.widget.WIDGET_DELEGATE, {
  resume_call() {
    // 1) START TIMERS FIRST
    if (screenType == WATCHFACE) normal_timerTextUpdate = timer.createTimer(0, 1000, text_update);
    normal_vaultboy_timer = timer.createTimer(0, 200, animate_vaultboy);
    // 2) then one-shot refreshes
    time_update(true, true); date_update(); text_update(); ampm_update();
  },
  pause_call() { /* stopTimer both timers, set to undefined */ },
});
```

**Timers are created before the one-shot updates on purpose.** If a one-shot update ever
throws, the timers (seconds + Vault Boy animation) are already running, so the face keeps
ticking. This ordering is a fix for a real regression where a throwing `ampm_update()` killed
the animation.

## Update functions

| Function | Driven by | What it does |
|----------|-----------|--------------|
| `time_update()` | — | No-op. The hour/minute digits are an `IMG_TIME` widget, which the firmware updates autonomously; nothing to do in JS. |
| `date_update()` | TIME sensor + `DAYCHANGE` | Reads `timeSensor.day/month/year`, zero-pads, and sets each per-digit date `IMG`'s `SRC` to the matching glyph (`0011`–`0020`). The native `IMG_DATE` widget does **not** render on Balance 2, so the date is drawn digit-by-digit. |
| `text_update()` | 1 s timer | Renders the two seconds digits via the `TextRotate` `IMG`s (positions them at `pos_x` and toggles `VISIBLE`). Skipped in AOD. |
| `ampm_update()` | resume + `DAYCHANGE` | Shows AM (`0024`) / PM (`0025`) **only in 12-hour mode** (`hmSetting.getTimeFormat() == 0`); hidden in 24-hour. Wrapped in try/catch. |
| `animate_vaultboy()` | 200 ms timer | Advances `normal_vaultboy_index` through the 8 frames `0057`–`0064` and updates the Vault Boy `IMG`'s `SRC`. |

The TIME-sensor `DAYCHANGE` listener (registered in `init_view()`) re-runs
`time_update`/`date_update`/`ampm_update` at midnight. This listener is safe — the TIME sensor
supports `DAYCHANGE` (unlike the DISTANCE sensor's `CHANGE`, which is not supported and threw).

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
| Time HH / MM | `IMG_TIME` | autonomous | `0001`–`0010` | 328,132 / 328,246 |
| Seconds | 2× `IMG` (TextRotate) | 1 s timer | `0011`–`0020` | 371,348 |
| AM/PM | `IMG` | 12h only | `0024`/`0025` | 366,371 |
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

## Origin

This project was generated by a GTR→Balance 2 converter (`convert_v2.py`, in the separate
`amazfit_gtr_tools` repo) from the source GTR Pip-Boy 3000 face, then hand-tuned over many
on-device iterations. The converter is **not** required to build or modify this watch face —
the project here is self-contained ZeppOS source. The durable lessons from that tuning live in
[ZEPPOS-FINDINGS.md](ZEPPOS-FINDINGS.md).
