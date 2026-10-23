export const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/** Bulatkan angka untuk atribut SVG. */
export const n = (v: number) => String(Math.round(v * 100) / 100)

/** Format rupiah ala id-ID: Rp15.000 / Rp15.000,50 (tanpa Intl agar konsisten di semua runtime). */
export function formatRupiah(raw: string | number | undefined): string {
  if (raw === undefined || raw === '') return ''
  const [int = '0', dec] = String(raw).split('.')
  return `Rp${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${dec ? ',' + dec.padEnd(2, '0') : ''}`
}

const NARROW = new Set("il.,:;'|!ijtfI1()[]/ ")
const WIDE = new Set('mwMW@')

/** Estimasi lebar teks sans-serif (px) tanpa mengukur font. Sedikit konservatif. */
export function estimateWidth(s: string, size: number, weight = 400, letterSpacing = 0): number {
  const bold = weight >= 600 ? 1.06 : 1
  let w = 0
  for (const ch of s) {
    if (ch === ' ') w += 0.28
    else if (NARROW.has(ch)) w += 0.3
    else if (WIDE.has(ch)) w += 0.84
    else if (ch >= 'A' && ch <= 'Z') w += 0.68
    else if (ch >= '0' && ch <= '9') w += 0.6
    else w += 0.56
  }
  return w * size * bold + letterSpacing * s.length
}

function wrap(text: string, size: number, weight: number, ls: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word
    if (cur && estimateWidth(next, size, weight, ls) > maxWidth) {
      lines.push(cur)
      cur = word
    } else cur = next
  }
  if (cur) lines.push(cur)
  return lines
}

/** Bungkus lalu perkecil teks (hingga 50%) sampai muat dalam maxWidth × maxLines. */
export function fitText(
  text: string,
  size: number,
  weight: number,
  letterSpacing: number,
  maxWidth: number | undefined,
  maxLines: number,
): { lines: string[]; size: number } {
  if (!maxWidth) return { lines: [text], size }
  let s = size
  for (let k = 0; k < 9; k++, s *= 0.92) {
    const lines = wrap(text, s, weight, letterSpacing, maxWidth)
    if (lines.length <= maxLines && lines.every((l) => estimateWidth(l, s, weight, letterSpacing) <= maxWidth)) {
      return { lines, size: s }
    }
  }
  s = size * 0.5
  const lines = wrap(text, s, weight, letterSpacing, maxWidth).slice(0, maxLines)
  const last = lines.length - 1
  if (last >= 0) {
    let l = lines[last]!
    while (l.length > 1 && estimateWidth(l + '…', s, weight, letterSpacing) > maxWidth) l = l.slice(0, -1)
    if (wrap(text, s, weight, letterSpacing, maxWidth).length > maxLines) lines[last] = l.trimEnd() + '…'
  }
  return { lines, size: s }
}
