import { encode } from 'uqr'
import { QristifierError } from './errors'
import { esc, n } from './text'
import type { QrStyle } from './types'

export const QR_STYLES: QrStyle[] = ['square', 'dots', 'rounded']

export interface QrDrawOptions {
  x: number
  y: number
  size: number
  quiet: number
  style: QrStyle
  fg: string
  bg: string
  /** Data URL logo; bila ada, ECC dinaikkan ke H dan bagian tengah dikosongkan */
  logo?: string
  /** `solid` (default): kotak latar di bawah logo. `none`: lubang bulat tanpa latar, cocok untuk logo transparan. */
  logoBg?: 'solid' | 'none'
  radius?: number
  /** Id unik untuk clip-path logo */
  uid: string
}

export function qrMatrix(payload: string, withLogo: boolean): boolean[][] {
  try {
    return encode(payload, { ecc: withLogo ? 'H' : 'M', border: 0 }).data
  } catch {
    throw new QristifierError('INVALID_INPUT', 'Payload terlalu panjang untuk dijadikan QR code')
  }
}

const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${n(x + r)} ${n(y)}h${n(w - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}v${n(h - 2 * r)}a${n(r)} ${n(r)} 0 0 1 -${n(r)} ${n(r)}h-${n(w - 2 * r)}a${n(r)} ${n(r)} 0 0 1 -${n(r)} -${n(r)}v-${n(h - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} -${n(r)}z`

/** Hasilkan fragmen SVG `<g>` berisi panel + modul QR (+ logo opsional). */
export function drawQr(payload: string, o: QrDrawOptions): string {
  const hasLogo = !!o.logo
  const m = qrMatrix(payload, hasLogo)
  const count = m.length
  const total = count + o.quiet * 2
  const cell = o.size / total
  const ox = o.x + o.quiet * cell
  const oy = o.y + o.quiet * cell

  // Area logo: ±24% sisi (≈6% luas) — aman untuk ECC H.
  let hole = 0
  if (hasLogo) {
    hole = Math.round(count * 0.24)
    if ((count - hole) % 2) hole++
  }
  const hs = (count - hole) / 2
  const round = o.logoBg === 'none'
  const mid = count / 2
  const inHole = (r: number, c: number) => {
    if (hole <= 0) return false
    if (round) return Math.hypot(c + 0.5 - mid, r + 0.5 - mid) <= hole / 2 + 0.25
    return r >= hs && r < hs + hole && c >= hs && c < hs + hole
  }
  const inFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= count - 7) || (r >= count - 7 && c < 7)
  const fancy = o.style !== 'square'

  let d = ''
  for (let r = 0; r < count; r++) {
    const row = m[r]!
    if (o.style === 'square') {
      let c = 0
      while (c < count) {
        if (!row[c] || inHole(r, c)) {
          c++
          continue
        }
        let e = c
        while (e < count && row[e] && !inHole(r, e)) e++
        d += `M${n(ox + c * cell)} ${n(oy + r * cell)}h${n((e - c) * cell)}v${n(cell)}h-${n((e - c) * cell)}z`
        c = e
      }
      continue
    }
    for (let c = 0; c < count; c++) {
      if (!row[c] || inHole(r, c) || inFinder(r, c)) continue
      const cx = ox + c * cell
      const cy = oy + r * cell
      if (o.style === 'dots') {
        const rad = cell * 0.44
        d += `M${n(cx + cell / 2 - rad)} ${n(cy + cell / 2)}a${n(rad)} ${n(rad)} 0 1 0 ${n(rad * 2)} 0a${n(rad)} ${n(rad)} 0 1 0 -${n(rad * 2)} 0z`
      } else {
        d += rrect(cx + cell * 0.03, cy + cell * 0.03, cell * 0.94, cell * 0.94, cell * 0.3)
      }
    }
  }
  if (fancy) {
    for (const [fr, fc] of [[0, 0], [0, count - 7], [count - 7, 0]] as const) {
      const fx = ox + fc * cell
      const fy = oy + fr * cell
      d += rrect(fx, fy, cell * 7, cell * 7, cell * 2) + rrect(fx + cell, fy + cell, cell * 5, cell * 5, cell * 1.2)
      d += rrect(fx + cell * 2, fy + cell * 2, cell * 3, cell * 3, cell * 0.9)
    }
  }

  const bgRect = `<rect x="${n(o.x)}" y="${n(o.y)}" width="${n(o.size)}" height="${n(o.size)}" rx="${n(o.radius ?? 0)}" fill="${esc(o.bg)}"/>`
  const rule = fancy ? ' fill-rule="evenodd"' : ''
  const shape = o.style === 'square' ? ' shape-rendering="crispEdges"' : ''
  let out = `<g>${bgRect}<path d="${d}" fill="${esc(o.fg)}"${rule}${shape}/>`
  if (hasLogo) {
    const lx = ox + hs * cell
    const ly = oy + hs * cell
    const ls = hole * cell
    const pad = round ? cell * 0.35 : cell * 0.5
    const cid = `@@qrlogo-${o.uid}`
    if (round) {
      out += `<image href="${esc(o.logo)}" x="${n(lx + pad)}" y="${n(ly + pad)}" width="${n(ls - pad * 2)}" height="${n(ls - pad * 2)}" preserveAspectRatio="xMidYMid meet"/>`
      return out + '</g>'
    }
    out +=
      `<rect x="${n(lx)}" y="${n(ly)}" width="${n(ls)}" height="${n(ls)}" rx="${n(cell * 1.5)}" fill="${esc(o.bg)}"/>` +
      `<clipPath id="${cid}"><rect x="${n(lx + pad)}" y="${n(ly + pad)}" width="${n(ls - pad * 2)}" height="${n(ls - pad * 2)}" rx="${n(cell)}"/></clipPath>` +
      `<image href="${esc(o.logo)}" x="${n(lx + pad)}" y="${n(ly + pad)}" width="${n(ls - pad * 2)}" height="${n(ls - pad * 2)}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${cid})"/>`
  }
  return out + '</g>'
}
