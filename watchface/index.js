import * as hmUI from '@zos/ui'
import { Time } from '@zos/sensor'
import { createTimer, stopTimer } from '@zos/timer'
import {
  launchApp, SYSTEM_APP_STATUS, SYSTEM_APP_HR, SYSTEM_APP_WEATHER,
  SYSTEM_APP_CALENDAR, SYSTEM_APP_ALARM, SYSTEM_APP_SETTING,
} from '@zos/router'

// Fonts / sprite groups (assets are in assets/balance2/, referenced by bare name).
const DATE_FONT = [
  '0011.png', '0012.png', '0013.png', '0014.png', '0015.png',
  '0016.png', '0017.png', '0018.png', '0019.png', '0020.png',
]
const BIG_TIME = [
  '0001.png', '0002.png', '0003.png', '0004.png', '0005.png',
  '0006.png', '0007.png', '0008.png', '0009.png', '0010.png',
]
const METRIC_FONT = [
  '0069.png', '0070.png', '0071.png', '0072.png', '0073.png',
  '0074.png', '0075.png', '0076.png', '0077.png', '0078.png',
]
const WEEK_IMG = ['0026.png', '0027.png', '0028.png', '0029.png', '0030.png', '0031.png', '0032.png']
const WEATHER_IMG = Array.from({ length: 27 }, (_, i) => `${(79 + i).toString().padStart(4, '0')}.png`)
const VAULT_FRAMES = ['0057.png', '0058.png', '0059.png', '0060.png', '0061.png', '0062.png', '0063.png', '0064.png']

// Date digits sit at these absolute x positions (snug to the baked separator dots), y=78.
const DATE_X = [82, 94, 111, 123, 143, 155, 167, 179]

const timeSensor = new Time()

WatchFace({
  build() {
    // ---- Background ----
    hmUI.createWidget(hmUI.widget.IMG, { x: 0, y: 0, w: 480, h: 480, src: '0000.png' })

    // ---- Day of week (auto-bound) ----
    hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
      x: 150, y: 24, image_array: WEEK_IMG, image_length: 7, type: hmUI.data_type.WEEK,
    })

    // ---- Date DD.MM.YYYY: per-digit IMGs, refreshed from the Time sensor ----
    this._dateImgs = DATE_X.map((x) =>
      hmUI.createWidget(hmUI.widget.IMG, { x, y: 78, src: '0011.png' })
    )

    // ---- Weather icon + temperature (auto-bound) ----
    hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
      x: 330, y: 78, image_array: WEATHER_IMG, image_length: 27, type: hmUI.data_type.WEATHER_CURRENT,
    })
    hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: 338, y: 78, w: 56, h: 24, font_array: DATE_FONT, h_space: -3,
      negative_image: '0021.png', align_h: hmUI.align.RIGHT, type: hmUI.data_type.WEATHER_CURRENT,
    })
    hmUI.createWidget(hmUI.widget.IMG, { x: 394, y: 78, src: '0023.png' }) // degree °

    // ---- Vault Boy (animated) ----
    this._vault = hmUI.createWidget(hmUI.widget.IMG, { x: 183, y: 130, src: VAULT_FRAMES[0] })

    // ---- Time: hours/minutes (big) + seconds (small), auto-bound ----
    hmUI.createWidget(hmUI.widget.IMG_TIME, {
      hour_startX: 328, hour_startY: 132, hour_array: BIG_TIME, hour_zero: 1, hour_align: hmUI.align.LEFT,
      minute_startX: 328, minute_startY: 246, minute_array: BIG_TIME, minute_zero: 1, minute_align: hmUI.align.LEFT,
      second_startX: 371, second_startY: 348, second_array: DATE_FONT, second_zero: 1, second_align: hmUI.align.LEFT,
    })

    // ---- Activity metrics (auto-bound) ----
    hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: 17, y: 149, w: 72, h: 24, font_array: METRIC_FONT, h_space: -3,
      align_h: hmUI.align.RIGHT, type: hmUI.data_type.CAL,
    })
    hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: 15, y: 216, w: 58, h: 24, font_array: METRIC_FONT, h_space: -3,
      align_h: hmUI.align.RIGHT, type: hmUI.data_type.HEART,
    })
    hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: 8, y: 277, w: 80, h: 24, font_array: METRIC_FONT, h_space: -3,
      dot_image: '0034.png', align_h: hmUI.align.RIGHT, type: hmUI.data_type.DISTANCE,
    })
    hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: 195, y: 369, w: 96, h: 24, font_array: METRIC_FONT, h_space: -3,
      align_h: hmUI.align.CENTER_H, type: hmUI.data_type.STEP,
    })

    // ---- Gauge bars (auto-bound, fill 0->5 by metric) ----
    hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
      x: 90, y: 159, w: 69, h: 15,
      image_array: ['0200.png', '0201.png', '0202.png', '0203.png', '0204.png', '0205.png'],
      image_length: 6, type: hmUI.data_type.CAL,
    })
    hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
      x: 73, y: 224, w: 72, h: 13,
      image_array: ['0206.png', '0207.png', '0208.png', '0209.png', '0210.png', '0211.png'],
      image_length: 6, type: hmUI.data_type.HEART,
    })
    hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
      x: 90, y: 286, w: 69, h: 15,
      image_array: ['0212.png', '0213.png', '0214.png', '0215.png', '0216.png', '0217.png'],
      image_length: 6, type: hmUI.data_type.STEP,
    })
    hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
      x: 194, y: 349, w: 91, h: 15,
      image_array: ['0218.png', '0219.png', '0220.png', '0221.png', '0222.png', '0223.png'],
      image_length: 6, type: hmUI.data_type.STEP,
    })

    // ---- Battery (auto-bound) + % glyph ----
    hmUI.createWidget(hmUI.widget.TEXT_IMG, {
      x: 74, y: 379, w: 58, h: 24, font_array: METRIC_FONT, h_space: -3,
      align_h: hmUI.align.RIGHT, type: hmUI.data_type.BATTERY,
    })
    hmUI.createWidget(hmUI.widget.IMG, { x: 132, y: 379, src: '0035.png' })

    // ---- Status icons (auto-bound) ----
    hmUI.createWidget(hmUI.widget.IMG_STATUS, { x: 312, y: 368, src: '0054.png', type: hmUI.system_status.DISCONNECT })
    hmUI.createWidget(hmUI.widget.IMG_STATUS, { x: 351, y: 368, src: '0052.png', type: hmUI.system_status.LOCK })
    hmUI.createWidget(hmUI.widget.IMG_STATUS, { x: 405, y: 366, src: '0055.png', type: hmUI.system_status.CLOCK })

    // ---- Tap-to-launch shortcuts ----
    // Invisible BUTTON overlays (hit area = w*h regardless of the transparent src). Created
    // last so they sit on top and receive touches. Each opens its relevant system app.
    const tapZone = (x, y, w, h, appId) =>
      hmUI.createWidget(hmUI.widget.BUTTON, {
        x, y, w, h, text: '',
        normal_src: 'transparent.png', press_src: 'transparent.png',
        click_func: () => {
          try { launchApp({ appId, native: true }) } catch (e) { console.log('launchApp failed', e) }
        },
      })
    tapZone(300, 70, 135, 44, SYSTEM_APP_WEATHER)    // weather icon + temperature
    tapZone(78, 72, 120, 32, SYSTEM_APP_CALENDAR)    // date DD.MM.YYYY
    tapZone(300, 120, 160, 220, SYSTEM_APP_ALARM)    // time HH/MM
    tapZone(10, 146, 155, 32, SYSTEM_APP_STATUS)     // calories -> Activity
    tapZone(10, 210, 140, 34, SYSTEM_APP_HR)         // pulse -> Heart Rate
    tapZone(5, 272, 160, 34, SYSTEM_APP_STATUS)      // distance -> Activity
    tapZone(185, 345, 110, 52, SYSTEM_APP_STATUS)    // steps -> Activity
    tapZone(40, 372, 120, 34, SYSTEM_APP_SETTING)    // battery -> Settings

    // ---- Dynamic bits: date refresh + Vault Boy walk cycle ----
    this.updateDate()
    this._dateTimer = createTimer(0, 60000, () => this.updateDate())

    this._vaultIndex = 0
    this._vaultTimer = createTimer(0, 200, () => {
      this._vaultIndex = (this._vaultIndex + 1) % VAULT_FRAMES.length
      this._vault.setProperty(hmUI.prop.SRC, VAULT_FRAMES[this._vaultIndex])
    })
  },

  updateDate() {
    const day = String(timeSensor.getDate()).padStart(2, '0')
    const month = String(timeSensor.getMonth()).padStart(2, '0')
    const year = String(timeSensor.getFullYear()).padStart(4, '0')
    const seq = day + month + year // 8 digits -> DATE_X
    for (let i = 0; i < this._dateImgs.length; i++) {
      this._dateImgs[i].setProperty(hmUI.prop.SRC, DATE_FONT[Number(seq[i])])
    }
  },

  onDestroy() {
    if (this._dateTimer) stopTimer(this._dateTimer)
    if (this._vaultTimer) stopTimer(this._vaultTimer)
  },
})
