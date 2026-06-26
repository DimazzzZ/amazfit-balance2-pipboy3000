# ZeppOS / Balance 2 findings

Hard-won, non-obvious platform lessons from building this watch face on a real Amazfit
Balance 2. Each is a thing that cost real debugging time and is **reusable on any ZeppOS
watch face**. Many of these only surfaced on the physical watch — the simulator / a static
renderer did not reproduce them.

> **Note on history:** the face was first built from *editor-exported* (pre-wrapped) JS at API
> 1.x and later **re-authored as modern `@zos` source** at API 4.0 (see finding #11). Findings
> #3 (init_view crash), #4 (`getTimeFormat` enum) and #5 (`IMG_DATE`) describe the legacy
> editor-form code and the API-1.x runtime; they remain instructive but no longer match the
> current source. The rest are runtime/rendering rules that still apply.

---

## 1. `TEXT_IMG.align_h` does nothing without an explicit box `w` — and clips to `w`

**Symptom:** Right/center-aligned numbers rendered left-anchored and landed on top of other
widgets; the battery read `%92`; the temperature was clipped off the round edge.

**Cause:** `align_h` aligns the content **inside the widget's box width `w`**. If you don't set
`w`, the box auto-fits the content, so `align_h: RIGHT`/`CENTER_H` is a no-op and `x` is just
the left edge. Worse, the box also **clips** its content: if `w` is narrower than the rendered
number, the leading digit(s) are cut off.

**Fix:** Always give an aligned `TEXT_IMG` an explicit `w` (and `h`). Make `w` wide enough for
the *widest realistic value* (e.g. 5-digit steps `10000`, 3-digit calories/pulse), keeping the
fixed edge where you want it:
- `align_h: RIGHT` → the right edge stays put, extra width extends left.
- `align_h: CENTER_H` → the box is centered on the anchor.

In this project every metric `TEXT_IMG` carries a `w` sized for its max value (see the widget
table in [ARCHITECTURE.md](ARCHITECTURE.md)).

---

## 2. `IMG_LEVEL` `type`-binding: which metrics fill, and the DISTANCE trap

`IMG_LEVEL` draws `image_array[level]`, and setting `type: hmUI.data_type.X` lets the firmware
pick the level from the metric automatically.

- **Works (fills by goal):** `STEP`, `CAL`, `HEART`. These have a target/goal the firmware uses
  as the 100% point (`STEP`/`STEP_TARGET`, `CAL`/`CAL_TARGET`; `HEART` maps over its range).
- **Does NOT work: `DISTANCE`.** It has **no `_TARGET`** and a fixed value range of `[0, 99]`
  km, so a real ~3 km distance maps to ~3% ≈ level 0 → the gauge looks empty.
- **Two `IMG_LEVEL`s cannot share the same `type`.** Binding both the Distance and Steps gauges
  to `STEP` only drives one of them; the other stays at level 0.

- **A `type`-bound gauge level can disagree with the `type`-bound *number*.** On-watch the
  `IMG_LEVEL type:CAL` bar read ~full while the `TEXT_IMG type:CAL` number showed only 27 kcal —
  the firmware maps the gauge level off a different calorie basis/goal than the active-kcal value
  it puts in the number. So even where `type` "works", the bar may not track what the user reads.

- **A type-less `IMG_LEVEL` (manual `level`) is unreliable on-device.** Dropping `type` and
  setting `setProperty(prop.MORE, { level })` rendered in the local preview but did **not** show on
  the watch (the box stayed dark). `IMG_LEVEL` with a *valid* `type` does render (the WEEK/WEATHER
  ones work) — but that brings the binding problems above.

**Resolution in this project (current):** the four metric gauges are **plain `IMG` widgets whose
`src` is swapped** to the right 6-level fill sprite (`gauge.setProperty(hmUI.prop.SRC, BARS[level])`)
— the exact `IMG`+`SRC` mechanism the Vault Boy and date digits use, which is **proven to render on
this device**. The level is computed in `updateGauges()` from `@zos/sensor` (Cal/Steps
`current/getTarget()`, Distance `current/full-scale`, Pulse over `[40,180]`), run on each sensor's
`onChange` + the 60 s timer. Because every sprite (incl. level 0) contains the green frame, the
border is **always** visible — never a black box — and the fill tracks the same value as the number.
Needs the `data:user.hd.{step,calorie,distance,heart_rate}` permissions. (Registering
`sensor.onChange` in `build()` is safe in modern `@zos`, unlike the legacy `init_view` crash in #3.)

**Install gotcha:** the watch can ignore a re-install that keeps the same `appId` **and** the same
`version` — it dedupes and keeps the old build. Bump `app.json` `version.code` (and `name`) on
every change you want to flash, or remove the old face first.

---

## 3. A bad call in `init_view()` bricks the *entire* face

**Symptom:** Vault Boy frozen, date blank, gauge black — all at once, with no obvious error.

**Cause:** `init_view()` runs top-to-bottom and creates the `WIDGET_DELEGATE` (which owns the
animation + seconds timers) **near the end**. Any statement that throws before that point aborts
`init_view()`, so the delegate is never created → `resume_call` never runs → no timers and no
one-shot updates. One bad line takes down everything downstream. The outer `try/catch` in the
generated file swallows the error, so it fails silently.

The specific trigger: `distSensor.addEventListener(distSensor.event.CHANGE, …)` — the DISTANCE
sensor does **not** support that listener and threw.

**Rules:**
- Only attach sensor listeners you know are supported. The **TIME sensor's `DAYCHANGE`** is
  fine and is used here; the **DISTANCE sensor's `CHANGE`** is not.
- Compute anything risky in the timer / `resume_call`, wrapped in `try/catch`, **not** in
  `init_view()`.
- Create timers **first** in `resume_call`, before one-shot updates, so a later throw can't stop
  them (see [ARCHITECTURE.md](ARCHITECTURE.md)).

---

## 4. `hmSetting.getTimeFormat()` returns `0`/`1` — there is no `time_format` enum

**Symptom:** The Vault Boy animation silently stopped (an earlier build).

**Cause:** Code referenced `hmSetting.time_format.HOUR_12`, which doesn't exist → `TypeError`
inside `ampm_update()` during `resume_call`, which aborted before the animation timer (this is
the regression that motivated the timers-first ordering in finding #3).

**Fix:** `hmSetting.getTimeFormat()` returns a plain number: **`0` = 12-hour, `1` = 24-hour**.
Compare against the literal:

```js
let is12h = hmSetting.getTimeFormat() == 0;
```

---

## 5. The native `IMG_DATE` widget does not render on Balance 2

**Symptom:** Only the baked-in separator dots showed; no date digits.

**Fix:** Draw the date as individual `IMG` widgets (one per digit) and update each one's `SRC`
from the TIME sensor in `date_update()` — the same proven mechanism as the seconds. See
`date_update()` in `watchface/index.js`.

---

## 6. The app cover (`Preview.png`) must be a ZeppOS **TGA**, not a PNG

**Symptom:** The watch face installed and ran fine, but the **Zepp mobile app showed no
cover/preview**.

**Cause:** ZeppOS's native image format is TGA (with a `.png` extension). The watch firmware
will read a plain PNG, but the **mobile app's cover loader needs the native TGA**. The reference
faces' `Preview.png` is an uncompressed, color-mapped TGA with:
- an 18-byte header: `idlen=46, cmaptype=1, imgtype=1, cmap_len=256, cmap_entrysize=32,
  depth=8, desc=0x20`,
- a **46-byte ID block**: `b"SOMHD\x01" + b"\x00"*40`,
- a **256 × 32-bit BGRA** colormap, then 8-bit palette indices (top-left origin).

**Fix:** When **packaging by hand** (the converter's path), encode `Preview.png` in exactly that
format (keep the `.png` name). When **building with Zeus**, this is automatic — provide a plain
PNG cover and `zeus build` resizes/encodes it (and converts every other PNG asset to TGA too),
so the source tree stays plain PNG. This repo builds with Zeus, so `assets/balance2/Preview.png`
is a plain PNG.

---

## 7. `appId` must be unique

**Symptom:** Cover didn't show in the app (compounding finding #6).

**Cause:** Reusing another installed app's `appId` collides — the app already associates that id
with the other face, so our cover wasn't shown.

**Fix:** Give every face a unique `appId`. This project uses a deterministic 7-digit id derived
from the source name (`1000000 + crc32(name) % 9000000` → `1742985`), distinct from the
reference faces' ids.

---

## 8. Image format: indexed-P with 1-byte transparency

All watch assets are RGBA→indexed **P-mode** PNGs with a 1-byte `tRNS` (palette index 0 =
transparent, 1–255 opaque). This is what the firmware expects and keeps the package small.

---

## 9. Locale- and setting-driven fields

These are controlled by the watch's settings, not by the face, so don't expect to "fix" them in
layout:
- **Temperature unit** (°C/°F) and **distance unit** (km/mi) follow the watch locale; the
  distance **decimal point** (`dot_image: '0034.png'`) shows or not depending on the unit.
- **AM/PM** is only meaningful in 12-hour mode (finding #4); it's hidden in 24-hour mode.

---

## 10. Building with the official `zeus` CLI

Packing this face with `zeus build` (v1.9.x) surfaced several project-layout requirements:

- **`app.json` source form uses `targets`.** A Zeus *source* project nests `module` /
  `platforms` / `designWidth` under `targets.<name>` (e.g. `targets.balance2`); Zeus flattens
  that into the top-level `module`/`platforms` form in the built *device* package. (So the flat
  app.json a hand-converter emits is actually Zeus's *output* form, which is why a hand-zipped
  package runs directly on the watch.)
- **Assets live under a per-target subfolder** `assets/<target>/` (matching the target name),
  not flat in `assets/`. With the wrong layout the asset step fails to find the files.
- **The target/device must be currently supported.** Zeus refuses unknown `deviceSource`s
  ("Unsupported targets … removed → Please set at least one package"). Balance 2 is
  `Lyon`/`LyonWN`/`LyonW` = deviceSource 9568512/13/15, round 480×480, API ≤ 4.2. The device
  list is fetched from Zepp and cached at `~/.zepp/.zeus_devices`.
- **The PNG→TGA converter rejects degenerate images** ("image size is too small"). Drop unused
  / 0-dimension sprites before building (this is why the 24 leftover sprites were pruned).
- **Pre-compiled `index.js` *builds* but does not run.** An editor-exported, already-wrapped
  file passes ROLLUP + QJSC and packs fine — but black-screens on device. See finding #11.
- **No login needed** for a local `zeus build`; login is only for publish / device preview.

---

## 11. Editor-exported JS rebuilt by Zeus = black screen; ship modern `@zos` source

**Symptom:** `zeus build` succeeded and the package installed (via Zepp Dev scan), but the watch
showed a **black screen** — no face at all.

**Cause:** the watch face was originally *editor-exported* JS — code already wrapped in the
ZeppOS runtime bootstrap (`__$$hmAppManager$$__`, `DeviceRuntimeCore.WidgetFactory`, the
"Watch_Face_Editor v18.0" header) that targets the **legacy 1.x runtime**. Feeding that to
`zeus build` and declaring **API 3.0** recompiled it to bytecode under a runtime that doesn't
provide those globals → the bootstrap throws at load → the outer `try/catch` swallows it → black.
Proof: the reference **mrc206en** (a working Balance 2 face of the same editor lineage) ships
`watchface/index.js` as **raw JS at API 1.0.1**, flat `module`, no `runtime.type` — i.e. it is
*not* rebuilt by Zeus; it's shipped as-is.

**Fix:** there are two valid packaging paths — don't mix them:
- **Legacy/raw:** ship the editor-exported JS as a plain package at **API 1.0.1** (zip the
  project; the JS runs as-is). This is what a hand-converter / the reference does.
- **Modern (this repo):** **re-author as `@zos` source** — `import * as hmUI from '@zos/ui'`,
  `import { Time } from '@zos/sensor'`, `import { createTimer } from '@zos/timer'`,
  `WatchFace({ build(){…}, onDestroy(){} })` — at `configVersion v3` / **API 4.0**, and let
  `zeus build` add its own runtime wrapper. Most widgets auto-update via `data_type` binding;
  only the date refresh and Vault Boy animation use `createTimer`. This builds *and* renders.

Rule of thumb: **`zeus build` is for `@zos` source, not for already-compiled editor output.**

---

## 12. Tap-to-launch shortcuts from a watch face

To open a system app when a face element is tapped, overlay a **transparent `BUTTON`** (hit area
= its `w×h`, irrespective of the `normal_src`/`press_src` image size — `transparent.png` works at
any size) and in `click_func` call **`@zos/router` `launchApp({ appId: SYSTEM_APP_*, native:
true })`** (system-app launch needs API ≥ 3.0). Create the buttons **last in `build()`** so they
sit on top and receive touches. `SYSTEM_APP_*` constants name the targets (`SYSTEM_APP_STATUS` =
Activity, `SYSTEM_APP_HR`, `SYSTEM_APP_WEATHER`, `SYSTEM_APP_CALENDAR`, `SYSTEM_APP_ALARM`,
`SYSTEM_APP_SETTING`, …). Wrap the call in try/catch — a `SYSTEM_APP_*` not present on a given
firmware just no-ops.

**For screens with no `SYSTEM_APP_*` constant, use an `IMG_CLICK` data_type shortcut.** Some
destinations can't be named via `launchApp` — notably the **battery page** (there's no
`SYSTEM_APP_BATTERY`, and `SYSTEM_APP_SETTING` only opens Settings *home*). The watchface-native
way in is a clickable region bound to a data type, which the firmware auto-routes:

```js
hmUI.createWidget(hmUI.widget.IMG_CLICK, { x, y, w, h, type: hmUI.data_type.BATTERY })
```

This face uses that for **battery → battery page**, and `BUTTON` + `launchApp` for the rest
(Activity/HR/Weather/Calendar/Alarm) so each of those targets is chosen by name. The reference
faces (mrc206/mrc209) confirm the `IMG_CLICK type:BATTERY` jump; they also reveal native screen
names usable with the legacy `hmApp.startApp({ url, native: true })` (e.g. `Settings_homeScreen`,
`ScheduleCalScreen`, `WeatherScreen`).

---

## 13. Prefer the native `IMG_ANIM` widget for sprite animation; never gate it on `getScreenType()`

**Best path — `IMG_ANIM`.** For a looping sprite animation (the Vault Boy walk), use the native
`hmUI.widget.IMG_ANIM` widget and let the **firmware** cycle the frames — no JS timer at all:

```js
hmUI.createWidget(hmUI.widget.IMG_ANIM, {
  x, y, anim_path: '', anim_prefix: 'pipboy', anim_ext: 'png',
  anim_fps: 8, anim_size: 8, anim_repeat: true, repeat_count: 255,
  anim_status: hmUI.anim_status.START,
})
```

It loads frames `<anim_prefix>_<0..anim_size-1>.<anim_ext>` (here `pipboy_0.png`…`pipboy_7.png`),
plays them at `anim_fps`, and the firmware handles visibility — robust on the Balance 2. Control
playback with `setProperty(hmUI.prop.ANIM_STATUS, hmUI.anim_status.START)` if needed. This is what
the project ships; it replaced the manual timer below.

**If you must hand-roll it with `createTimer` + `setProperty(prop.SRC, frame)`** (the project did
this first, and it works *once you avoid the trap below*): a free-running timer keeps firing while
the face is hidden — wasting battery — so tie it to the visibility delegate:

- Register a **`WIDGET_DELEGATE`** with `resume_call`/`pause_call`; create the repeating timers in
  `resume_call` and `stopTimer()` them in `pause_call` (and `onDestroy`), so they only run while
  the face is actually shown.
- Also call your resume logic **once at the end of `build()`** so the first paint/animation doesn't
  wait on the first resume event — guard it (`if (this._running) return`) so it's idempotent if
  `resume_call` then fires.

**⚠️ Do NOT gate the animation on `getScreenType()` on the Balance 2.** An earlier version tried to
skip the walk in AOD with `getScreenType() === SCREEN_TYPE_AOD` (both at timer-creation time and per
frame). On this device `getScreenType()` **matches `SCREEN_TYPE_AOD` during the normal watchface
render**, so the Vault Boy timer was never created and frames were skipped — the boy stayed frozen
while the **ungated** refresh timer kept the date/gauges updating (classic symptom: "everything
moves except the animation"). The fix: create the walk timer **unconditionally** in `resume_call`
and advance every tick; let the `resume_call`/`pause_call` delegate alone start/stop it. That still
stops the walk whenever the face is hidden (the common AOD path also pauses the face), without
trusting an unreliable screen-type read. If you ever need true AOD-only behavior, use a dedicated
AOD build/render rather than branching on `getScreenType()` here.

Keep the static one-shot paint (date/gauges) in `build()` so the face is correct immediately even
before the first resume. (For maximum robustness wrap sensor/router/timer calls in a tiny
`safe(fn)` try/catch helper — a not-ready sensor then degrades to an empty gauge instead of a
broken build.)

---

## 14. Localizing *image* labels: per-language baked assets picked by `getLanguage()`

When the on-screen labels are **baked into images** (here the background `0000.png` and the
weekday sprites) rather than rendered as text, you cannot localize them with `app.json`'s string
`i18n` (that only translates the app *name* shown in the phone app). Instead, **ship one set of
baked assets per language and select the set at runtime**:

- `import { getLanguage } from '@zos/settings'`. It returns a **number**, not a string — in the
  ZeppOS multilingual map **en-US is `2`**. Read it once at module load: `const EN =
  getLanguage() === 2` (wrap in try/catch and default to the fallback language; a not-ready read
  shouldn't break the face).
- Make only the language-dependent widgets switch on it: the background `IMG` `src`
  (`0000_en.png` vs `0000.png`) and the weekday `IMG_LEVEL` `image_array` (`0226`–`0232` vs
  `0026`–`0032`). Keep them on **one shared coordinate set** by building the alternate background
  as the *same* layout with the labels re-lettered in place — then numbers/gauges/time need no
  per-language tuning.
- Generating the alternate background: erase each label from the base background by copying the
  adjacent texture (for a CRT-scanline field, copy a clean patch from directly above/beside the
  label at an **even** row offset so the scanline parity matches — a flat fill or a far-sampled
  median shows up as a visibly darker block), then composite the translated word (keyed to its
  lit pixels) at the same anchor.
- Verify both languages before flashing: the local previewer mocks `getLanguage()` (env
  `PREVIEW_LANG=en` → `2`) so you can render each language headless. Confirm on-device by changing
  the watch's system language; if it doesn't switch, the assumed numeric code is wrong — adjust
  the constant.

---

## Meta-lesson

The Balance 2 firmware diverges from both the simulator and a naïve static renderer in several
places (alignment, the TGA cover, sensor binding, animation, `IMG_DATE`, and the editor-vs-`@zos`
packaging split). **The physical watch is the ground truth** — every one of the findings above
was invisible until the face ran on the device and was photographed.
