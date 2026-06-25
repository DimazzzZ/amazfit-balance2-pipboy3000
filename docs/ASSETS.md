# Asset index map

All images live in `assets/balance2/` (the per-target folder; the target is `balance2` in
`app.json`). They are numbered PNGs (`NNNN.png`), in **indexed-P** mode with 1-byte
transparency (palette index 0 = transparent). The watch face references every asset listed
below; the present ranges are **`0000`–`0105`** (minus the pruned sprites noted at the bottom)
and **`0200`–`0223`**, plus the named files.

At build time `zeus build` converts these PNGs to the native ZeppOS **TGA** format in the
device package — so the source stays as plain PNG and you don't hand-encode TGA. (`Preview.png`
is the one exception in spirit: keep it a plain PNG here; Zeus resizes/encodes the cover.)

See the widget table in [ARCHITECTURE.md](ARCHITECTURE.md) for where each is placed.

## Referenced assets

| Range | Count | What | Used by |
|-------|-------|------|---------|
| `0000` | 1 | Background — Pip-Boy frame, scanlines, all static labels (ВРЕМЯ, gauge frames, PIP-BOY 3000 / ROBCO INDUSTRIES, separator dots) | background `IMG` |
| `0001`–`0010` | 10 | Large clock digits 0–9 | `IMG_TIME` (hours, minutes) |
| `0011`–`0020` | 10 | Small/medium digits 0–9 | date, temperature, seconds |
| `0021` | 1 | Minus sign `−` | temperature `negative_image` |
| `0023` | 1 | Degree symbol `°` | after the temperature value |
| `0024` / `0025` | 2 | AM / PM glyphs | AM/PM `IMG` (12-hour mode only) |
| `0026`–`0032` | 7 | Day-of-week labels (MO…SU) | day-of-week `IMG_LEVEL` (`WEEK`) |
| `0034` | 1 | Decimal point (7×22) | distance `dot_image` |
| `0035` | 1 | Percent `%` | battery `%` `IMG` |
| `0052` | 1 | Lock icon | `IMG_STATUS` `LOCK` |
| `0054` | 1 | Bluetooth/disconnect icon | `IMG_STATUS` `DISCONNECT` |
| `0055` | 1 | Alarm/clock icon | `IMG_STATUS` `CLOCK` |
| `0057`–`0064` | 8 | Vault Boy walk-cycle frames | animated Vault Boy `IMG` (200 ms) |
| `0069`–`0078` | 10 | Bold metric digits 0–9 | calories, pulse, distance, steps, battery |
| `0079`–`0105` | 27 | Weather condition icons | weather `IMG_LEVEL` (`WEATHER_CURRENT`) |
| `0200`–`0205` | 6 | Calories gauge fill (level 0→5, empty→full) | calories gauge `IMG_LEVEL` (`CAL`) |
| `0206`–`0211` | 6 | Pulse gauge fill (level 0→5) | pulse gauge `IMG_LEVEL` (`HEART`) |
| `0212`–`0217` | 6 | Distance gauge fill (level 0→5) | distance gauge `IMG_LEVEL` (bound `STEP`; empty on-watch) |
| `0218`–`0223` | 6 | Steps gauge fill (level 0→5) | steps gauge `IMG_LEVEL` (`STEP`) |

### Gauge fill sprites (`02xx`)

Each gauge's six images are a complete bar at six fill levels — the frame outline plus the
solid fill, with a transparent empty interior — ordered **empty (index 0) → full (index 5)**.
`IMG_LEVEL` overlays the (erased) gauge box in the background and the firmware picks the index
from the metric. These were produced by resizing the source's native gauge sprites to each
box's pixel size.

## Named files

| File | What |
|------|------|
| `Preview.png` | App cover — a full render of the face, a **plain PNG**. `zeus build` resizes it and encodes the device cover. Referenced by `app.json` `icon`/`cover`. (When packaged by hand instead of Zeus, the cover must be hand-encoded as a ZeppOS TGA — see finding #6 in [ZEPPOS-FINDINGS.md](ZEPPOS-FINDINGS.md).) |
| `transparent.png` | Small fully-transparent placeholder. |
| `fonts/2Expansiva-bold.ttf` | TrueType font carried from the reference watch face (used by the ZeppOS runtime). |

## Pruned source sprites

The original GTR conversion carried 24 unreferenced leftover sprites (`0022`, `0033`,
`0036`–`0051`, `0053`, `0056`, `0065`–`0068`). They were **removed** — `zeus build`'s PNG→TGA
converter rejects degenerate/too-small images (it failed on `0033.png`), and they were unused
anyway. Among them, `0046`–`0051` were the source's original native-size gauge sprites that had
already been resized into the per-gauge `02xx` copies.
