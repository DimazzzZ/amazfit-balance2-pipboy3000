#!/usr/bin/env node
/*
 * Local static renderer for this ZeppOS watch face — zero dependencies (Node built-ins only).
 *
 * Instead of guessing at the source with regexes, it *runs* watchface/index.js under mocked
 * `@zos` modules and records every createWidget(...) call with its real, evaluated props (and
 * any setProperty updates). It then composites the PNG assets onto a 480x480 canvas with
 * representative mock data and writes a PNG — so the preview matches the actual code regardless
 * of loops / shorthand / computed values.
 *
 * It models ZeppOS TEXT_IMG semantics: align_h only takes effect inside an explicit box width
 * `w`; otherwise the content is left-anchored at `x`. The result is clipped to the round 480px
 * screen.
 *
 * Usage: node preview.js [out.png]   (default: preview.png; run from the project root)
 */
'use strict'
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// ---------------------------------------------------------------- PNG decode (8-bit, non-interlaced)
function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

// Returns { width, height, data: Buffer(RGBA) } or null if the file is missing.
function decodePng(file) {
  if (!fs.existsSync(file)) return null
  const buf = fs.readFileSync(file)
  let p = 8 // skip signature
  let width = 0, height = 0, bitDepth = 8, colorType = 6
  let palette = null, trns = null
  const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p)
    const type = buf.toString('latin1', p + 4, p + 8)
    const data = buf.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4)
      bitDepth = data[8]; colorType = data[9]
    } else if (type === 'PLTE') {
      palette = data
    } else if (type === 'tRNS') {
      trns = data
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }
    p += 12 + len // len + type(4) + data + crc(4)
  }
  if (bitDepth !== 8) throw new Error(`${file}: unsupported bit depth ${bitDepth}`)
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType]
  if (!channels) throw new Error(`${file}: unsupported color type ${colorType}`)

  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const cur = Buffer.alloc(stride)
  const prev = Buffer.alloc(stride)
  const out = Buffer.alloc(width * height * 4)
  let rp = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++]
    raw.copy(cur, 0, rp, rp + stride); rp += stride
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0
      const b = prev[i]
      const c = i >= channels ? prev[i - channels] : 0
      let v = cur[i]
      if (filter === 1) v = (v + a) & 0xff
      else if (filter === 2) v = (v + b) & 0xff
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff
      else if (filter === 4) v = (v + paeth(a, b, c)) & 0xff
      cur[i] = v
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4
      if (colorType === 3) {
        const idx = cur[x]
        out[o] = palette[idx * 3]; out[o + 1] = palette[idx * 3 + 1]; out[o + 2] = palette[idx * 3 + 2]
        out[o + 3] = trns && idx < trns.length ? trns[idx] : 255
      } else if (colorType === 0) {
        const g = cur[x]; out[o] = out[o + 1] = out[o + 2] = g; out[o + 3] = 255
      } else if (colorType === 2) {
        const s = x * 3; out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = 255
      } else if (colorType === 4) {
        const s = x * 2; out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = cur[s + 1]
      } else { // 6
        const s = x * 4; out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = cur[s + 3]
      }
    }
    cur.copy(prev)
  }
  return { width, height, data: out }
}

// ---------------------------------------------------------------- PNG encode (RGBA -> type 6)
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'latin1')
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([t, data])) >>> 0)
  return Buffer.concat([len, t, data, crc])
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8-bit, RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------- canvas
function makeCanvas(w, h) {
  const data = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++) data[i * 4 + 3] = 255 // opaque black
  return { w, h, data }
}

function alphaComposite(canvas, img, dx, dy) {
  if (!img) return
  dx = Math.round(dx); dy = Math.round(dy)
  for (let y = 0; y < img.height; y++) {
    const cy = dy + y
    if (cy < 0 || cy >= canvas.h) continue
    for (let x = 0; x < img.width; x++) {
      const cx = dx + x
      if (cx < 0 || cx >= canvas.w) continue
      const si = (y * img.width + x) * 4
      const a = img.data[si + 3]
      if (a === 0) continue
      const di = (cy * canvas.w + cx) * 4
      const ia = 255 - a
      canvas.data[di] = (img.data[si] * a + canvas.data[di] * ia) / 255
      canvas.data[di + 1] = (img.data[si + 1] * a + canvas.data[di + 1] * ia) / 255
      canvas.data[di + 2] = (img.data[si + 2] * a + canvas.data[di + 2] * ia) / 255
      canvas.data[di + 3] = Math.max(canvas.data[di + 3], a)
    }
  }
}

function roundClip(canvas) {
  const r = canvas.w / 2, cx = r, cy = r
  for (let y = 0; y < canvas.h; y++) {
    for (let x = 0; x < canvas.w; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) {
        const di = (y * canvas.w + x) * 4
        canvas.data[di] = canvas.data[di + 1] = canvas.data[di + 2] = 0
        canvas.data[di + 3] = 255
      }
    }
  }
}

// ---------------------------------------------------------------- asset cache + digit drawing
let ASSETS = '.'
const _cache = {}
function load(name) {
  if (!name) return null
  if (!(name in _cache)) {
    try { _cache[name] = decodePng(path.join(ASSETS, name)) } catch { _cache[name] = null }
  }
  return _cache[name]
}

function drawDigits(canvas, fontArr, text, x, y, hSpace = 0, align = 'LEFT', w = null) {
  if (!fontArr || !fontArr.length || text == null) return
  const imgs = [...String(text)].map((ch) =>
    /\d/.test(ch) && +ch < fontArr.length ? load(fontArr[+ch]) : null
  )
  const total = imgs.reduce((s, im) => s + (im ? im.width : 7) + hSpace, 0)
  let cx = x
  if (w && align === 'RIGHT') cx = x + w - total
  else if (w && align === 'CENTER_H') cx = x + Math.floor(w / 2) - Math.floor(total / 2)
  for (const im of imgs) {
    const step = im ? im.width : 7
    if (im) alphaComposite(canvas, im, cx, y)
    cx += step + hSpace
  }
}

// ---------------------------------------------------------------- run the watchface under mocks
// Representative values for data_type-bound widgets (time/metrics/weather/etc.).
const MOCK = {
  WEEK: 1, WEATHER_ICON: 2, WEATHER_CURRENT: '17',
  CAL: '75', HEART: '87', DISTANCE: '070', STEP: '1000', BATTERY: '100',
  HOUR: '12', MINUTE: '00', SECOND: '00', GAUGE_FRAC: 0.5,
  DATE: { year: 2020, month: 1, day: 7, hour: 12, minute: 0, second: 0, weekday: 2 },
}

function nameProxy() {
  return new Proxy({}, { get: (_, k) => (typeof k === 'string' ? k : undefined) })
}

// Rewrite ES imports into `const … = __require('mod')` so any @zos module resolves to a mock.
function transformImports(src) {
  return src
    .replace(/^\s*import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"];?\s*$/gm,
      (_, ns, mod) => `const ${ns} = __require(${JSON.stringify(mod)});`)
    .replace(/^\s*import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?\s*$/gm,
      (_, names, mod) => {
        const binds = names.split(',').map((n) => n.trim()).filter(Boolean)
          .map((n) => n.replace(/\s+as\s+/, ': ')).join(', ')
        return `const { ${binds} } = __require(${JSON.stringify(mod)});`
      })
    .replace(/^\s*import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?\s*$/gm,
      (_, name, mod) => `const ${name} = (__require(${JSON.stringify(mod)}).default || __require(${JSON.stringify(mod)}));`)
}

// Execute watchface/index.js and return the ordered list of created widgets.
function collectWidgets(folder) {
  let src = fs.readFileSync(path.join(folder, 'watchface', 'index.js'), 'utf8')
  src = transformImports(src)

  const widgets = []
  const hmUI = {
    widget: nameProxy(), data_type: nameProxy(), align: nameProxy(),
    system_status: nameProxy(), show_level: nameProxy(), text_style: nameProxy(),
    prop: nameProxy(),
    createWidget(type, props) {
      const w = {
        type,
        props: Object.assign({}, props),
        setProperty(p, v) {
          // prop.SRC -> 'SRC'; map common props onto the recorded spec
          if (p === 'SRC') this.props.src = v
          else if (p === 'MORE' && v && typeof v === 'object') Object.assign(this.props, v)
          else if (typeof p === 'string') this.props[p.toLowerCase()] = v
        },
        getProperty() { return undefined },
      }
      widgets.push(w)
      return w
    },
    deleteWidget() {}, updateStatusBarTitle() {}, setStatusBarVisible() {},
  }
  const d = MOCK.DATE
  class Time {
    getFullYear() { return d.year } getMonth() { return d.month } getDate() { return d.day }
    getDay() { return d.weekday } getHours() { return d.hour } getMinutes() { return d.minute }
    getSeconds() { return d.second } getTime() { return 0 } getZone() { return 0 }
  }
  // Module registry for the rewritten imports. Unknown modules / named exports resolve to
  // harmless callables (e.g. `@zos/router` SYSTEM_APP_* constants, `launchApp`) — none of the
  // click handlers run during a preview anyway.
  const anyMock = new Proxy(function () {}, { get: () => anyMock, apply: () => undefined })
  const MODS = {
    '@zos/ui': hmUI,
    '@zos/sensor': { Time },
    '@zos/timer': { createTimer: () => 1, stopTimer: () => {} },
  }
  const __require = (mod) => MODS[mod] || new Proxy({}, { get: () => anyMock })
  const WatchFace = (obj) => { if (obj && typeof obj.build === 'function') obj.build() }

  const fn = new Function('__require', 'WatchFace', src)
  fn(__require, WatchFace)
  return widgets
}

// ---------------------------------------------------------------- render
function renderToFile(folder, outPng) {
  ASSETS = path.join(folder, 'assets')
  if (!fs.readdirSync(ASSETS).some((f) => f.endsWith('.png'))) {
    const sub = fs.readdirSync(ASSETS).find((dd) => fs.statSync(path.join(ASSETS, dd)).isDirectory())
    if (sub) ASSETS = path.join(ASSETS, sub)
  }

  const canvas = makeCanvas(480, 480)
  const widgets = collectWidgets(folder)

  for (const { type, props } of widgets) {
    if (type === 'IMG' || type === 'IMG_STATUS') {
      if (props.src) alphaComposite(canvas, load(props.src), props.x || 0, props.y || 0)
    } else if (type === 'IMG_LEVEL') {
      const ia = props.image_array || []
      if (!ia.length) continue
      let idx
      if (props.type === 'WEEK') idx = MOCK.WEEK
      else if (props.type === 'WEATHER_CURRENT') idx = MOCK.WEATHER_ICON
      else idx = Math.floor((ia.length - 1) * MOCK.GAUGE_FRAC)
      idx = Math.max(0, Math.min(idx, ia.length - 1))
      alphaComposite(canvas, load(ia[idx]), props.x || 0, props.y || 0)
    } else if (type === 'TEXT_IMG') {
      const val = MOCK[props.type]
      if (val != null && props.font_array) {
        const al = props.align_h === 'CENTER_H' ? 'CENTER_H' : (props.align_h === 'RIGHT' ? 'RIGHT' : 'LEFT')
        drawDigits(canvas, props.font_array, val, props.x || 0, props.y || 0, props.h_space || 0, al, props.w)
      }
    } else if (type === 'IMG_TIME') {
      drawDigits(canvas, props.hour_array, MOCK.HOUR, props.hour_startX || 0, props.hour_startY || 0,
        props.hour_space || 0, props.hour_align === 'CENTER_H' ? 'CENTER_H' : 'LEFT')
      drawDigits(canvas, props.minute_array, MOCK.MINUTE, props.minute_startX || 0, props.minute_startY || 0,
        props.minute_space || 0, props.minute_align === 'CENTER_H' ? 'CENTER_H' : 'LEFT')
      if (props.second_array) {
        drawDigits(canvas, props.second_array, MOCK.SECOND, props.second_startX || 0, props.second_startY || 0,
          props.second_space || 0, 'LEFT')
      }
    } else if (type === 'IMG_DATE') {
      const dd = String(MOCK.DATE.day).padStart(2, '0')
      const mm = String(MOCK.DATE.month).padStart(2, '0')
      drawDigits(canvas, props.day_array, dd, props.day_startX || 0, props.day_startY || 0)
      drawDigits(canvas, props.month_array, mm, props.month_startX || 0, props.month_startY || 0)
    }
  }

  roundClip(canvas)
  fs.writeFileSync(outPng, encodePng(canvas.w, canvas.h, canvas.data))
  console.log('wrote', outPng)
}

const out = process.argv[2] || 'preview.png'
renderToFile(process.cwd(), out)
