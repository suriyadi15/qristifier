import type { Fee } from 'qrisnamis'

export type QrStyle = 'square' | 'dots' | 'rounded'

export interface Colors {
  primary: string
  accent: string
  background: string
  text: string
  muted: string
  /** Warna modul QR */
  qr: string
  /** Latar panel QR */
  qrBg: string
  /** Warna teks di atas `primary` (otomatis dari luminansi bila tidak diisi) */
  onPrimary: string
  /** Warna teks di atas `accent` */
  onAccent: string
}

export type Vars = Record<string, unknown>

interface Base {
  /** Nama variabel; elemen hanya dirender bila nilainya truthy. Awali `!` untuk kebalikan. */
  if?: string
  opacity?: number
}

export interface RectEl extends Base {
  type: 'rect'
  x: number
  y: number
  w: number
  h: number
  rx?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  gradient?: { from: string; to: string; angle?: number }
}
export interface CircleEl extends Base {
  type: 'circle'
  cx: number
  cy: number
  r: number
  fill?: string
  stroke?: string
  strokeWidth?: number
}
export interface PathEl extends Base {
  type: 'path'
  d: string
  fill?: string
  stroke?: string
  strokeWidth?: number
}
export interface TextEl extends Base {
  type: 'text'
  x: number
  y: number
  text: string
  size: number
  weight?: number
  fill?: string
  anchor?: 'start' | 'middle' | 'end'
  /** Lebar maksimum (px); teks dibungkus lalu diperkecil agar muat */
  maxWidth?: number
  maxLines?: number
  letterSpacing?: number
  upper?: boolean
}
export interface ImageEl extends Base {
  type: 'image'
  x: number
  y: number
  w: number
  h: number
  /** Data URL gambar, mis. `{{logo}}`, `{{assets.qris}}` */
  href: string
  /** Radius sudut (px); setengah sisi = lingkaran */
  rx?: number
}
export interface QrEl extends Base {
  type: 'qr'
  x: number
  y: number
  size: number
  /** Zona tenang dalam jumlah modul (default 1) */
  quiet?: number
  style?: string
  fg?: string
  bg?: string
  /** Data URL logo di tengah QR (kosong = tanpa logo) */
  logo?: string
  /** `solid` | `none` (default dari opsi `logoBackground`) */
  logoBg?: string
  radius?: number
}
export type TemplateElement = RectEl | CircleEl | PathEl | TextEl | ImageEl | QrEl

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'color' | 'boolean' | 'select' | 'image'
  default?: string | number | boolean
  options?: { value: string; label: string }[]
  description?: string
}

export interface RenderContext {
  width: number
  height: number
  vars: Vars
  colors: Colors
  payload: string
}

export interface TemplateSpec {
  id: string
  name: string
  description: string
  width: number
  height: number
  /** Tema bawaan (default `merah`) */
  theme?: string
  fields?: FieldDef[]
  elements?: TemplateElement[]
  /** Escape hatch: render SVG sendiri (tidak bisa dikirim lewat API) */
  render?: (ctx: RenderContext) => string
}

export interface RenderOptions {
  /** ID template bawaan atau spec sendiri. Default `gpn`. */
  template?: string | TemplateSpec
  /** Bila diisi, payload statis diubah dulu menjadi QRIS dinamis */
  amount?: number | string
  fee?: Fee
  referenceId?: string
  /** Payload wajib QRIS valid. Default true; `false` untuk teks/payload bebas. */
  strict?: boolean
  merchantName?: string
  city?: string
  nmid?: string
  theme?: string
  colors?: Partial<Colors>
  qrStyle?: QrStyle
  /** Logo di tengah QR / header (data URL gambar) */
  logo?: string
  /** `solid` (default): kotak latar di bawah logo. `none`: tanpa latar (lubang bulat), cocok untuk logo transparan. */
  logoBackground?: 'solid' | 'none'
  /** Nilai field template (title, subtitle, footer, …) */
  fields?: Record<string, string | number | boolean>
  /** Pengali ukuran atribut width/height SVG (viewBox tetap). Default 1. */
  scale?: number
}

export interface RenderResult {
  svg: string
  width: number
  height: number
  /** Payload akhir yang tertanam di QR */
  payload: string
  merchant: { name?: string; city?: string; nmid?: string }
}
