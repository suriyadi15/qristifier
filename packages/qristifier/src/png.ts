import { initWasm, Resvg } from '@resvg/resvg-wasm'
import { INTER_400, INTER_700 } from './assets/fonts'
import { QristifierError } from './errors'
import { renderQRISDetailed } from './render'
import type { RenderOptions, RenderResult } from './types'

type WasmInput = Parameters<typeof initWasm>[0]

let ready: Promise<void> | undefined
let fonts: Uint8Array[] | undefined

const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

/**
 * Inisialisasi resvg-wasm. Di Node dipanggil otomatis; di Cloudflare Workers/browser
 * berikan `WebAssembly.Module` (atau Response/bytes) dari `@resvg/resvg-wasm/index_bg.wasm`.
 */
export function initPng(wasm: WasmInput): Promise<void> {
  ready ??= initWasm(wasm).catch((e) => {
    ready = undefined
    throw e
  })
  return ready
}

async function ensureReady() {
  if (ready) return ready
  if (typeof process !== 'undefined' && process.versions?.node) {
    const spec = 'node:module'
    const { createRequire } = (await import(/* @vite-ignore */ spec)) as typeof import('node:module')
    const fsSpec = 'node:fs/promises'
    const { readFile } = (await import(/* @vite-ignore */ fsSpec)) as typeof import('node:fs/promises')
    const path = createRequire(import.meta.url).resolve('@resvg/resvg-wasm/index_bg.wasm')
    return initPng(await readFile(path))
  }
  throw new QristifierError('PNG_NOT_READY', 'Panggil initPng(wasm) terlebih dahulu di lingkungan non-Node')
}

export interface PngOptions {
  /** Lebar PNG (px); tinggi mengikuti rasio. Default = lebar template. */
  width?: number
  /** Latar PNG, mis. `#ffffff`. Default transparan. */
  background?: string
  /** Font tambahan (TTF/OTF). Inter Regular & Bold sudah disertakan. */
  fonts?: Uint8Array[]
}

/** Ubah SVG hasil qristifier menjadi PNG. */
export async function svgToPng(svg: string, opts: PngOptions = {}): Promise<Uint8Array> {
  await ensureReady()
  fonts ??= [b64(INTER_400), b64(INTER_700)]
  const resvg = new Resvg(svg, {
    fitTo: opts.width ? { mode: 'width', value: Math.round(opts.width) } : { mode: 'original' },
    background: opts.background,
    font: { fontBuffers: [...fonts, ...(opts.fonts ?? [])], defaultFontFamily: 'Inter', loadSystemFonts: false },
  })
  return resvg.render().asPng()
}

/** Render langsung ke PNG. Mengembalikan juga metadata render. */
export async function renderQRISPng(
  input: string,
  opts: RenderOptions & PngOptions = {},
): Promise<{ png: Uint8Array } & Omit<RenderResult, 'svg'>> {
  const { width, background, fonts: extra, ...render } = opts
  const { svg, ...meta } = renderQRISDetailed(input, { ...render, scale: 1 })
  const png = await svgToPng(svg, { width: width ?? meta.width, background: background ?? '#ffffff', fonts: extra })
  return { png, ...meta }
}
