import { QristifierError } from './errors'
import { drawQr, QR_STYLES } from './qr'
import { safeColor } from './themes'
import { esc, estimateWidth, fitText, n } from './text'
import type { QrStyle, TemplateElement, TemplateSpec, Vars } from './types'

const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif"
const DATA_IMAGE = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[a-z0-9+/=]+$/i
const MAX_ELEMENTS = 200

function lookup(vars: Vars, path: string): unknown {
  let cur: unknown = vars
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

export const truthy = (v: unknown) =>
  v !== undefined && v !== null && v !== '' && v !== false && v !== 'false' && v !== 0

/** Ganti `{{path}}` dengan nilai variabel (tidak ada → string kosong). */
export function interpolate(str: string | undefined, vars: Vars): string {
  return (str ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, p: string) => {
    const v = lookup(vars, p)
    return v === undefined || v === null ? '' : String(v)
  })
}

/** Hanya data URL gambar base64 yang diterima; selain itu kosong (elemen dilewati). */
export function safeImage(href: string): string {
  const v = href.trim()
  if (!v) return ''
  if (!DATA_IMAGE.test(v)) {
    throw new QristifierError('INVALID_INPUT', 'Gambar harus berupa data URL base64 (png, jpeg, webp, gif, svg)')
  }
  return v
}

function visible(el: TemplateElement, vars: Vars): boolean {
  if (!el.if) return true
  const neg = el.if.startsWith('!')
  const v = truthy(lookup(vars, neg ? el.if.slice(1) : el.if))
  return neg ? !v : v
}

const paint = (v: string | undefined, vars: Vars, fallback: string) => safeColor(interpolate(v, vars), fallback)
const op = (el: { opacity?: number }) => (el.opacity !== undefined && el.opacity < 1 ? ` opacity="${n(el.opacity)}"` : '')

export function renderElements(spec: TemplateSpec, vars: Vars, payload: string): string {
  let defs = ''
  let body = ''
  let uid = 0
  for (const el of spec.elements ?? []) {
    if (!visible(el, vars)) continue
    const id = String(++uid)
    switch (el.type) {
      case 'rect': {
        let fill = paint(el.fill, vars, 'none')
        if (el.gradient) {
          const a = ((el.gradient.angle ?? 135) * Math.PI) / 180
          const x2 = 0.5 + Math.sin(a) / 2
          const y2 = 0.5 - Math.cos(a) / 2
          defs += `<linearGradient id="@@g${id}" x1="${n(1 - x2)}" y1="${n(1 - y2)}" x2="${n(x2)}" y2="${n(y2)}"><stop offset="0" stop-color="${esc(paint(el.gradient.from, vars, '#000'))}"/><stop offset="1" stop-color="${esc(paint(el.gradient.to, vars, '#000'))}"/></linearGradient>`
          fill = `url(#@@g${id})`
        }
        const stroke = el.stroke ? ` stroke="${esc(paint(el.stroke, vars, 'none'))}" stroke-width="${n(el.strokeWidth ?? 1)}"` : ''
        body += `<rect x="${n(el.x)}" y="${n(el.y)}" width="${n(el.w)}" height="${n(el.h)}"${el.rx ? ` rx="${n(el.rx)}"` : ''} fill="${esc(fill)}"${stroke}${op(el)}/>`
        break
      }
      case 'circle': {
        const stroke = el.stroke ? ` stroke="${esc(paint(el.stroke, vars, 'none'))}" stroke-width="${n(el.strokeWidth ?? 1)}"` : ''
        body += `<circle cx="${n(el.cx)}" cy="${n(el.cy)}" r="${n(el.r)}" fill="${esc(paint(el.fill, vars, 'none'))}"${stroke}${op(el)}/>`
        break
      }
      case 'path': {
        const stroke = el.stroke ? ` stroke="${esc(paint(el.stroke, vars, 'none'))}" stroke-width="${n(el.strokeWidth ?? 1)}"` : ''
        body += `<path d="${esc(el.d)}" fill="${esc(paint(el.fill, vars, 'none'))}"${stroke}${op(el)}/>`
        break
      }
      case 'text': {
        let text = interpolate(el.text, vars).replace(/\s+/g, ' ').trim()
        if (!text) break
        if (el.upper) text = text.toUpperCase()
        const weight = el.weight ?? 400
        const ls = el.letterSpacing ?? 0
        const { lines, size } = fitText(text, el.size, weight, ls, el.maxWidth, Math.max(1, el.maxLines ?? 1))
        const anchor = el.anchor ?? 'start'
        const spans = lines
          .map((l, i) => `<tspan x="${n(el.x)}"${i ? ` dy="${n(size * 1.18)}"` : ''}>${esc(l)}</tspan>`)
          .join('')
        body += `<text x="${n(el.x)}" y="${n(el.y)}" font-size="${n(size)}" font-weight="${weight}" text-anchor="${anchor}" fill="${esc(paint(el.fill, vars, '#000'))}"${ls ? ` letter-spacing="${n(ls)}"` : ''}${op(el)}>${spans}</text>`
        break
      }
      case 'image': {
        const href = safeImage(interpolate(el.href, vars))
        if (!href) break
        let clip = ''
        let attr = ''
        if (el.rx) {
          defs += `<clipPath id="@@c${id}"><rect x="${n(el.x)}" y="${n(el.y)}" width="${n(el.w)}" height="${n(el.h)}" rx="${n(el.rx)}"/></clipPath>`
          attr = ` clip-path="url(#@@c${id})"`
        }
        body += `${clip}<image href="${esc(href)}" x="${n(el.x)}" y="${n(el.y)}" width="${n(el.w)}" height="${n(el.h)}" preserveAspectRatio="xMidYMid meet"${attr}${op(el)}/>`
        break
      }
      case 'qr': {
        const style = interpolate(el.style, vars) || String(vars.qrStyle ?? 'square')
        body += drawQr(payload, {
          x: el.x,
          y: el.y,
          size: el.size,
          quiet: el.quiet ?? 1,
          style: (QR_STYLES.includes(style as QrStyle) ? style : 'square') as QrStyle,
          fg: paint(el.fg ?? '{{colors.qr}}', vars, '#000'),
          bg: paint(el.bg ?? '{{colors.qrBg}}', vars, '#fff'),
          logo: safeImage(interpolate(el.logo ?? '{{logo}}', vars)) || undefined,
          logoBg: interpolate(el.logoBg ?? '{{logoBackground}}', vars) === 'none' ? 'none' : 'solid',
          radius: el.radius,
          uid: id,
        })
        break
      }
    }
  }
  return (defs ? `<defs>${defs}</defs>` : '') + body
}

// ---------- validasi spec dari sumber tak tepercaya (API / editor) ----------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const fail = (msg: string): never => {
  throw new QristifierError('INVALID_TEMPLATE', msg)
}
const num = (v: unknown, path: string, min = -10000, max = 10000): number => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) fail(`${path} harus angka ${min}..${max}`)
  return v as number
}
const str = (v: unknown, path: string, max = 500): string => {
  if (typeof v !== 'string' || v.length > max) fail(`${path} harus string (maks ${max} karakter)`)
  return v as string
}
const optStr = (v: unknown, path: string, max?: number) => (v === undefined ? undefined : str(v, path, max))
const optNum = (v: unknown, path: string, min?: number, max?: number) => (v === undefined ? undefined : num(v, path, min, max))
const PATH_D = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]*$/

/** Validasi dan normalisasi spec template JSON. Spec dengan `render` (fungsi) ditolak. */
export function validateTemplate(input: unknown): TemplateSpec {
  if (!isObj(input)) return fail('Template harus berupa objek')
  if ('render' in input) fail('Template dengan fungsi render tidak diperbolehkan')
  const spec: TemplateSpec = {
    id: str(input.id ?? 'custom', 'id', 40),
    name: str(input.name ?? 'Custom', 'name', 80),
    description: str(input.description ?? '', 'description', 300),
    width: num(input.width, 'width', 100, 4000),
    height: num(input.height, 'height', 100, 4000),
    theme: optStr(input.theme, 'theme', 40),
    fields: [],
    elements: [],
  }
  if (input.fields !== undefined) {
    if (!Array.isArray(input.fields) || input.fields.length > 30) fail('fields maksimal 30 item')
    for (const [i, f] of (input.fields as unknown[]).entries()) {
      if (!isObj(f)) return fail(`fields[${i}] tidak valid`)
      const type = f.type
      if (!['text', 'number', 'color', 'boolean', 'select', 'image'].includes(type as string)) fail(`fields[${i}].type tidak dikenal`)
      spec.fields!.push({
        key: str(f.key, `fields[${i}].key`, 40),
        label: str(f.label ?? f.key, `fields[${i}].label`, 80),
        type: type as 'text',
        default: f.default as string | number | boolean | undefined,
        options: Array.isArray(f.options)
          ? (f.options as unknown[]).slice(0, 30).map((o, j) => {
              const oo = isObj(o) ? o : fail(`fields[${i}].options[${j}] tidak valid`)
              return { value: str(oo.value, 'option.value', 80), label: str(oo.label ?? oo.value, 'option.label', 80) }
            })
          : undefined,
      })
    }
  }
  if (!Array.isArray(input.elements)) return fail('elements harus berupa array')
  const els = input.elements as unknown[]
  if (els.length > MAX_ELEMENTS) fail(`elements maksimal ${MAX_ELEMENTS}`)
  for (const [i, raw] of els.entries()) {
    const p = `elements[${i}]`
    if (!isObj(raw)) return fail(`${p} tidak valid`)
    const base = { if: optStr(raw.if, `${p}.if`, 60), opacity: optNum(raw.opacity, `${p}.opacity`, 0, 1) }
    switch (raw.type) {
      case 'rect': {
        const g = raw.gradient
        spec.elements!.push({
          ...base, type: 'rect',
          x: num(raw.x, `${p}.x`), y: num(raw.y, `${p}.y`), w: num(raw.w, `${p}.w`, 0), h: num(raw.h, `${p}.h`, 0),
          rx: optNum(raw.rx, `${p}.rx`, 0), fill: optStr(raw.fill, `${p}.fill`, 80), stroke: optStr(raw.stroke, `${p}.stroke`, 80),
          strokeWidth: optNum(raw.strokeWidth, `${p}.strokeWidth`, 0, 200),
          gradient: isObj(g) ? { from: str(g.from, `${p}.gradient.from`, 80), to: str(g.to, `${p}.gradient.to`, 80), angle: optNum(g.angle, `${p}.gradient.angle`, -360, 360) } : undefined,
        })
        break
      }
      case 'circle':
        spec.elements!.push({
          ...base, type: 'circle', cx: num(raw.cx, `${p}.cx`), cy: num(raw.cy, `${p}.cy`), r: num(raw.r, `${p}.r`, 0),
          fill: optStr(raw.fill, `${p}.fill`, 80), stroke: optStr(raw.stroke, `${p}.stroke`, 80), strokeWidth: optNum(raw.strokeWidth, `${p}.strokeWidth`, 0, 200),
        })
        break
      case 'path': {
        const d = str(raw.d, `${p}.d`, 4000)
        if (!PATH_D.test(d)) fail(`${p}.d mengandung karakter tidak valid`)
        spec.elements!.push({
          ...base, type: 'path', d,
          fill: optStr(raw.fill, `${p}.fill`, 80), stroke: optStr(raw.stroke, `${p}.stroke`, 80), strokeWidth: optNum(raw.strokeWidth, `${p}.strokeWidth`, 0, 200),
        })
        break
      }
      case 'text':
        spec.elements!.push({
          ...base, type: 'text', x: num(raw.x, `${p}.x`), y: num(raw.y, `${p}.y`), text: str(raw.text, `${p}.text`, 500),
          size: num(raw.size, `${p}.size`, 1, 1000), weight: optNum(raw.weight, `${p}.weight`, 100, 900), fill: optStr(raw.fill, `${p}.fill`, 80),
          anchor: raw.anchor === 'middle' || raw.anchor === 'end' ? raw.anchor : 'start',
          maxWidth: optNum(raw.maxWidth, `${p}.maxWidth`, 1), maxLines: optNum(raw.maxLines, `${p}.maxLines`, 1, 10),
          letterSpacing: optNum(raw.letterSpacing, `${p}.letterSpacing`, -50, 100), upper: raw.upper === true,
        })
        break
      case 'image':
        spec.elements!.push({
          ...base, type: 'image', x: num(raw.x, `${p}.x`), y: num(raw.y, `${p}.y`), w: num(raw.w, `${p}.w`, 0), h: num(raw.h, `${p}.h`, 0),
          href: str(raw.href, `${p}.href`, 200), rx: optNum(raw.rx, `${p}.rx`, 0),
        })
        break
      case 'qr':
        spec.elements!.push({
          ...base, type: 'qr', x: num(raw.x, `${p}.x`), y: num(raw.y, `${p}.y`), size: num(raw.size, `${p}.size`, 20),
          quiet: optNum(raw.quiet, `${p}.quiet`, 0, 10), style: optStr(raw.style, `${p}.style`, 40), fg: optStr(raw.fg, `${p}.fg`, 80),
          bg: optStr(raw.bg, `${p}.bg`, 80), logo: optStr(raw.logo, `${p}.logo`, 80), logoBg: optStr(raw.logoBg, `${p}.logoBg`, 20), radius: optNum(raw.radius, `${p}.radius`, 0),
        })
        break
      default:
        fail(`${p}.type tidak dikenal`)
    }
  }
  if (!spec.elements!.some((e) => e.type === 'qr')) fail('Template wajib punya minimal satu elemen qr')
  return spec
}

export { FONT, estimateWidth }
