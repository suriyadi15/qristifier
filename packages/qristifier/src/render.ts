import { parseQRIS, toDynamicQRIS, validateQRIS, QRISError } from 'qrisnamis'
import { QristifierError } from './errors'
import { FONT, renderElements, safeImage } from './spec'
import { fieldsOf, getTemplate } from './templates'
import { resolveColors } from './themes'
import { esc, formatRupiah, n } from './text'
import { QR_STYLES } from './qr'
import { GPN_LOGO, QRIS_LOGO } from './assets/logos'
import type { RenderOptions, RenderResult, TemplateSpec, Vars } from './types'


function resolveTemplate(t: RenderOptions['template']): TemplateSpec {
  return typeof t === 'object' && t !== null ? t : getTemplate(t ?? 'gpn')
}

function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function renderQRISDetailed(input: string, opts: RenderOptions = {}): RenderResult {
  const spec = resolveTemplate(opts.template)
  const strict = opts.strict ?? true
  let payload = (input ?? '').trim()
  if (!payload) throw new QristifierError('INVALID_INPUT', 'Payload kosong')

  const wantsDynamic = opts.amount !== undefined || opts.fee !== undefined || opts.referenceId !== undefined
  try {
    if (wantsDynamic) {
      if (opts.amount === undefined) throw new QristifierError('INVALID_INPUT', 'fee/referenceId membutuhkan amount')
      payload = toDynamicQRIS(payload, { amount: opts.amount, fee: opts.fee, referenceId: opts.referenceId, strict })
    } else if (strict) {
      const { valid, errors } = validateQRIS(payload)
      if (!valid) throw new QristifierError('INVALID_QRIS', `Payload bukan QRIS valid: ${errors.join('; ')}`)
    }
  } catch (e) {
    if (e instanceof QRISError) throw new QristifierError('INVALID_QRIS', e.message)
    throw e
  }

  let name: string | undefined
  let city: string | undefined
  let nmid: string | undefined
  let amount: string | undefined
  try {
    const info = parseQRIS(payload)
    name = info.merchant.name
    city = info.merchant.city
    nmid = info.merchant.nmid
    amount = info.amount
  } catch {
    /* payload bebas: field merchant dibiarkan kosong */
  }

  const fieldDefs = fieldsOf(spec)
  const vars: Vars = {}
  for (const f of fieldDefs) if (f.default !== undefined) vars[f.key] = f.default
  Object.assign(vars, opts.fields)

  const theme = opts.theme ?? (typeof vars.theme === 'string' ? vars.theme : undefined) ?? spec.theme
  const colors = resolveColors(theme, opts.colors)
  const qrStyle = opts.qrStyle ?? (typeof vars.qrStyle === 'string' ? vars.qrStyle : 'square')
  const logo = opts.logo ?? (typeof vars.logo === 'string' ? vars.logo : '')

  Object.assign(vars, {
    payload,
    merchantName: opts.merchantName ?? name ?? '',
    city: opts.city ?? city ?? '',
    nmid: opts.nmid ?? nmid ?? '',
    amount: formatRupiah(amount),
    amountRaw: amount ?? '',
    colors,
    qrStyle: QR_STYLES.includes(qrStyle as never) ? qrStyle : 'square',
    logo: logo ? safeImage(logo) : '',
    logoBackground: (opts.logoBackground ?? vars.logoBackground) === 'none' ? 'none' : 'solid',
    assets: { qris: QRIS_LOGO, gpn: GPN_LOGO },
  })

  const { width, height } = spec
  const scale = opts.scale && opts.scale > 0 && opts.scale <= 10 ? opts.scale : 1
  const inner = spec.render
    ? spec.render({ width, height, vars, colors, payload })
    : renderElements(spec, vars, payload)
  // id clipPath/gradient harus unik antar SVG bila beberapa SVG di-inline dalam satu halaman.
  // Prefix diturunkan dari hash konten sehingga output tetap deterministik.
  const unique = (str: string) => str.replace(/(id="|url\(#)@@/g, `$1q${hash(str)}-`)
  const svg = unique(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n(width * scale)}" height="${n(height * scale)}" viewBox="0 0 ${width} ${height}" font-family="${esc(FONT)}">` +
      inner +
      '</svg>',
  )

  return {
    svg,
    width,
    height,
    payload,
    merchant: { name: vars.merchantName as string, city: vars.city as string, nmid: vars.nmid as string },
  }
}

/** Render QRIS menjadi string SVG dari template pilihan. */
export function renderQRIS(input: string, opts: RenderOptions = {}): string {
  return renderQRISDetailed(input, opts).svg
}
