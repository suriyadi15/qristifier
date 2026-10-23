import { QristifierError } from '../errors'
import type { FieldDef, TemplateElement, TemplateSpec } from '../types'
import { validateTemplate } from '../spec'
import { themeNames } from '../themes'
import { QR_STYLES } from '../qr'
import { card } from './card'
import { gpn } from './gpn'
import { minimal } from './minimal'
import { poster } from './poster'
import { sticker } from './sticker'
import { story } from './story'

export const templates: Record<string, TemplateSpec> = Object.fromEntries(
  [gpn, minimal, card, poster, sticker, story].map((t) => [t.id, t]),
)

export function listTemplates(): TemplateSpec[] {
  return Object.values(templates)
}

export function getTemplate(id: string): TemplateSpec {
  const t = templates[id]
  if (!t) throw new QristifierError('UNKNOWN_TEMPLATE', `Template "${id}" tidak ada. Pilihan: ${Object.keys(templates).join(', ')}`)
  return t
}

const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Field template + field umum (tema, gaya QR, logo) — satu sumber untuk form generator dan dokumentasi API. */
export function fieldsOf(spec: TemplateSpec): FieldDef[] {
  const own = spec.fields ?? []
  const common: FieldDef[] = [
    { key: 'theme', label: 'Tema warna', type: 'select', default: spec.theme ?? 'merah', options: themeNames.map((v) => ({ value: v, label: label(v) })) },
    { key: 'qrStyle', label: 'Gaya QR', type: 'select', default: 'square', options: QR_STYLES.map((v) => ({ value: v, label: label(v) })) },
    { key: 'logo', label: 'Logo (tengah QR)', type: 'image' },
    { key: 'logoBackground', label: 'Latar logo', type: 'select', default: 'solid', options: [{ value: 'solid', label: 'Kotak latar' }, { value: 'none', label: 'Tanpa latar (bulat)' }] },
  ]
  return [...own, ...common.filter((c) => !own.some((f) => f.key === c.key))]
}

export type TemplateOverrides = Partial<Omit<TemplateSpec, 'render'>> & {
  /** Elemen tambahan di atas elemen dasar */
  appendElements?: TemplateElement[]
  /** Elemen tambahan di bawah elemen dasar (latar) */
  prependElements?: TemplateElement[]
}

/** Turunkan template dari template lain. `fields` digabung per `key`; `elements` menimpa bila diisi. */
export function extendTemplate(base: string | TemplateSpec, over: TemplateOverrides): TemplateSpec {
  const b = typeof base === 'string' ? getTemplate(base) : base
  const { appendElements, prependElements, fields, elements, ...rest } = over
  const mergedFields = [...(b.fields ?? [])]
  for (const f of fields ?? []) {
    const i = mergedFields.findIndex((x) => x.key === f.key)
    if (i >= 0) mergedFields[i] = f
    else mergedFields.push(f)
  }
  return {
    ...b,
    ...rest,
    fields: mergedFields,
    elements: [...(prependElements ?? []), ...(elements ?? b.elements ?? []), ...(appendElements ?? [])],
  }
}

/** Validasi spec JSON (mis. dari editor) atau terima template kode ber-`render`. */
export function defineTemplate(spec: unknown): TemplateSpec {
  // Template kode (punya fungsi render) dipercaya apa adanya; JSON divalidasi.
  if (typeof spec === 'object' && spec !== null && typeof (spec as TemplateSpec).render === 'function') return spec as TemplateSpec
  return validateTemplate(spec)
}

export { card, gpn, minimal, poster, sticker, story }
