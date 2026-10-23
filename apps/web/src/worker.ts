import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { cors } from 'hono/cors'
import { QRISError, parseQRIS, validateQRIS } from 'qrisnamis'
import {
  QristifierError,
  defineTemplate,
  fieldsOf,
  listTemplates,
  renderQRISDetailed,
  themeNames,
  type RenderOptions,
} from 'qristifier'
import { initPng, svgToPng } from 'qristifier/png'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'

const EXAMPLE_QRIS =
  '00020101021126640012ID.DUMMY.WWW01189360000000000000010215ID12345678901230303UMI51440014ID.CO.QRIS.WWW0215ID00000000000000303UMI5204581253033605802ID5909TOKO TEST6007JAKARTA61051234562070703A016304BE67'
const LEGAL_PATH = '/legal'
const MAX_LOGO = 256 * 1024
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

// ---------- schema ----------
const FeeSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('prompt') }),
    z.object({ type: z.literal('fixed'), value: z.union([z.number(), z.string()]) }),
    z.object({ type: z.literal('percent'), value: z.union([z.number(), z.string()]) }),
  ])
  .openapi('Fee', { example: { type: 'fixed', value: 500 } })

const Common = {
  qris: z.string().min(1).openapi({ description: 'Payload QRIS (teks hasil decode QR). Statis atau dinamis.', example: EXAMPLE_QRIS }),
  template: z.string().max(40).default('gpn').openapi({ description: 'ID template, lihat `GET /api/templates`', example: 'gpn' }),
  merchantName: z.string().max(100).optional().openapi({ description: 'Override nama merchant (default: dari payload)' }),
  nmid: z.string().max(40).optional(),
  theme: z.enum(themeNames as [string, ...string[]]).optional().openapi({ description: 'Tema warna bawaan' }),
  qrStyle: z.enum(['square', 'dots', 'rounded']).optional(),
  logo: z
    .string()
    .max(400_000)
    .optional()
    .openapi({ description: 'Logo di tengah QR: data URL base64 atau URL https gambar (maks 256 KB).' }),
  logoBackground: z.enum(['solid', 'none']).optional().openapi({ description: '`none` = logo tanpa kotak latar (lubang bulat), cocok untuk logo transparan.' }),
  format: z.enum(['svg', 'png']).default('svg').openapi({ description: 'PNG dirender di server (bisa melewati batas CPU plan gratis).' }),
  width: z.coerce.number().int().min(100).max(4000).optional().openapi({ description: 'Lebar PNG (px). Default = lebar template.' }),
  download: z.enum(['1', 'true']).optional().openapi({ description: 'Kirim sebagai unduhan (Content-Disposition: attachment)' }),
}

const RenderBody = z
  .object({
    qris: Common.qris,
    template: z
      .union([z.string().max(40), z.record(z.string(), z.unknown())])
      .default('gpn')
      .openapi({ description: 'ID template bawaan **atau** objek spec template JSON (lihat panduan di /docs).', example: 'gpn' }),
    amount: z.union([z.number(), z.string()]).optional().openapi({ description: 'Bila diisi, QRIS statis diubah menjadi dinamis dengan nominal ini', example: 15000 }),
    fee: FeeSchema.optional(),
    referenceId: z.string().max(25).optional().openapi({ example: 'INV-0001' }),
    strict: z.boolean().optional().openapi({ description: 'Wajib QRIS valid (default true). `false` untuk teks bebas.' }),
    merchantName: Common.merchantName,
    city: z.string().max(60).optional(),
    nmid: Common.nmid,
    theme: Common.theme,
    colors: z.record(z.string(), z.string().max(40)).optional().openapi({ description: 'Override warna: primary, accent, background, text, muted, qr, qrBg', example: { primary: '#0ea5e9' } }),
    qrStyle: Common.qrStyle,
    logo: Common.logo,
    logoBackground: Common.logoBackground,
    fields: z
      .record(z.string(), z.union([z.string().max(300), z.number(), z.boolean()]))
      .optional()
      .openapi({ description: 'Nilai field template, mis. `title`, `subtitle`, `footer`', example: { footer: 'Terima kasih!' } }),
    format: Common.format,
    width: z.number().int().min(100).max(4000).optional(),
    download: z.boolean().optional(),
  })
  .openapi('RenderRequest')

const RenderQuery = z.object({
  qris: Common.qris,
  template: Common.template,
  amount: z.string().optional().openapi({ description: 'Nominal rupiah → QRIS dinamis', example: '15000' }),
  referenceId: z.string().max(25).optional(),
  feeType: z.enum(['prompt', 'fixed', 'percent']).optional(),
  feeValue: z.string().optional(),
  strict: z.enum(['true', 'false']).optional(),
  merchantName: Common.merchantName,
  nmid: Common.nmid,
  theme: Common.theme,
  qrStyle: Common.qrStyle,
  logo: Common.logo,
  logoBackground: Common.logoBackground,
  format: Common.format,
  width: Common.width,
  download: Common.download,
})

const ParseBody = z.object({ qris: z.string().min(1).openapi({ example: EXAMPLE_QRIS }) }).openapi('ParseRequest')

const ErrorSchema = z
  .object({ error: z.object({ code: z.string(), message: z.string(), issues: z.array(z.unknown()).optional() }) })
  .openapi('Error')

// ---------- app ----------
const app = new OpenAPIHono<{ Bindings: Env }>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Request tidak valid', issues: result.error.issues } },
        400,
      )
    }
  },
})

app.use('/api/*', cors({ origin: '*', exposeHeaders: ['X-Disclaimer'] }))
app.use('/api/*', async (c, next) => {
  await next()
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Disclaimer', `Gunakan hanya QRIS milik Anda; lihat ${new URL(LEGAL_PATH, c.req.url).href}`)
})

class ApiError extends Error {
  constructor(readonly code: string, message: string) {
    super(message)
  }
}

app.onError((err, c) => {
  if (err instanceof QristifierError || err instanceof QRISError || err instanceof ApiError) {
    return c.json({ error: { code: err.code as string, message: err.message } }, 400)
  }
  console.error(err)
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan pada server' } }, 500)
})

const errorResponses = {
  400: { description: 'Input tidak valid', content: { 'application/json': { schema: ErrorSchema } } },
} as const

// ---------- helpers ----------
const toBase64 = (bytes: Uint8Array) => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

/** Logo boleh data URL atau URL https; yang terakhir diunduh server lalu dijadikan data URL. */
async function resolveLogo(logo: string | undefined): Promise<string | undefined> {
  if (!logo) return undefined
  if (logo.startsWith('data:')) return logo
  let url: URL
  try {
    url = new URL(logo)
  } catch {
    throw new ApiError('INVALID_LOGO', 'logo harus data URL atau URL https')
  }
  if (url.protocol !== 'https:') throw new ApiError('INVALID_LOGO', 'URL logo harus https')
  const res = await fetch(url, {
    signal: AbortSignal.timeout(3000),
    redirect: 'follow',
    headers: { 'User-Agent': 'qristifier (+https://qristifier.pages.dev)', Accept: 'image/*' },
  }).catch(() => {
    throw new ApiError('INVALID_LOGO', 'Gagal mengunduh logo')
  })
  const type = (res.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase()
  if (!res.ok || !LOGO_TYPES.includes(type)) throw new ApiError('INVALID_LOGO', 'Logo harus gambar png/jpeg/webp/gif/svg')
  const tooLarge = () => new ApiError('FILE_TOO_LARGE', 'Ukuran logo maksimal 256 KB')
  if (Number(res.headers.get('content-length') ?? 0) > MAX_LOGO) throw tooLarge()
  // Baca bertahap dan hentikan begitu melewati batas (content-length bisa absen/bohong).
  const reader = res.body?.getReader()
  if (!reader) throw new ApiError('INVALID_LOGO', 'Gagal membaca logo')
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > MAX_LOGO) {
      await reader.cancel()
      throw tooLarge()
    }
    chunks.push(value)
  }
  const buf = new Uint8Array(size)
  let off = 0
  for (const c of chunks) {
    buf.set(c, off)
    off += c.length
  }
  return `data:${type};base64,${toBase64(buf)}`
}

interface RenderParams extends Omit<RenderOptions, 'template' | 'colors'> {
  template: string | Record<string, unknown>
  colors?: Record<string, string>
  format: 'svg' | 'png'
  width?: number
  download?: boolean
}

async function respondRender(qris: string, p: RenderParams, cache: string): Promise<Response> {
  const { format, width, download, template, logo, ...rest } = p
  const options: RenderOptions = {
    ...rest,
    colors: rest.colors as RenderOptions['colors'],
    template: typeof template === 'string' ? template : defineTemplate(template),
    logo: await resolveLogo(logo),
  }
  const r = renderQRISDetailed(qris, options)
  const id = typeof template === 'string' ? template : 'custom'
  const headers: Record<string, string> = { 'Cache-Control': cache }
  if (download) headers['Content-Disposition'] = `attachment; filename="qris-${id}.${format}"`
  if (format === 'png') {
    await initPng(resvgWasm)
    const png = await svgToPng(r.svg, { width: width ?? r.width, background: '#ffffff' })
    return new Response(png, { headers: { ...headers, 'Content-Type': 'image/png' } })
  }
  // SVG bisa memuat gambar dari pengguna; CSP mencegah skrip jalan bila dibuka langsung sebagai halaman.
  const csp = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox"
  return new Response(r.svg, { headers: { ...headers, 'Content-Type': 'image/svg+xml; charset=utf-8', 'Content-Security-Policy': csp } })
}

const imageContent = {
  'image/svg+xml': { schema: z.string().openapi({ format: 'binary' }) },
  'image/png': { schema: z.string().openapi({ format: 'binary' }) },
}

// GET /api/templates
app.openapi(
  createRoute({
    method: 'get',
    path: '/api/templates',
    tags: ['Template'],
    summary: 'Daftar template, field, dan tema',
    description:
      'Setiap template mendeklarasikan `fields` (judul, footer, dll). Isi lewat `fields` pada `POST /api/render`. ' +
      'Field `theme`, `qrStyle`, dan `logo` berlaku untuk semua template.',
    responses: {
      200: {
        description: 'Daftar template',
        content: {
          'application/json': {
            schema: z
              .object({
                templates: z.array(
                  z.object({
                    id: z.string(),
                    name: z.string(),
                    description: z.string(),
                    width: z.number(),
                    height: z.number(),
                    theme: z.string().optional(),
                    fields: z.array(z.record(z.string(), z.unknown())),
                    preview: z.string(),
                  }),
                ),
                themes: z.array(z.string()),
              })
              .openapi('TemplateList'),
          },
        },
      },
    },
  }),
  (c) => {
    const origin = new URL(c.req.url).origin
    return c.json(
      {
        templates: listTemplates().map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          width: t.width,
          height: t.height,
          theme: t.theme,
          fields: fieldsOf(t) as unknown as Record<string, unknown>[],
          preview: `${origin}/api/render?template=${t.id}&qris=${encodeURIComponent(EXAMPLE_QRIS)}`,
        })),
        themes: themeNames,
      },
      200,
    )
  },
)

// GET /api/render
app.openapi(
  createRoute({
    method: 'get',
    path: '/api/render',
    tags: ['Render'],
    summary: 'Gambar QRIS dari template (GET)',
    description:
      'Cocok untuk `<img src="...">`. Mengembalikan gambar langsung.\n\n' +
      'Field template dapat diisi dengan parameter `field.<key>` (mis. `field.footer=Terima kasih`) ' +
      'dan warna dengan `color.<key>` (mis. `color.primary=%230ea5e9`).',
    request: { query: RenderQuery },
    responses: { 200: { description: 'Gambar', content: imageContent }, ...errorResponses },
  }),
  async (c) => {
    const q = c.req.valid('query')
    const raw = c.req.query()
    const fields: Record<string, string> = {}
    const colors: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('field.')) fields[k.slice(6)] = v.slice(0, 300)
      else if (k.startsWith('color.')) colors[k.slice(6)] = v
    }
    let fee: RenderOptions['fee']
    if (q.feeType === 'prompt') fee = { type: 'prompt' }
    else if (q.feeType) {
      if (!q.feeValue) throw new ApiError('INVALID_FEE', 'feeValue wajib untuk fee fixed/percent')
      fee = { type: q.feeType, value: q.feeValue }
    }
    const { qris, strict, download, ...rest } = q
    return (await respondRender(
      qris,
      { ...rest, fee, fields, colors, strict: strict ? strict === 'true' : undefined, download: !!download } as RenderParams,
      'public, max-age=3600',
    )) as never
  },
)

// POST /api/render
app.openapi(
  createRoute({
    method: 'post',
    path: '/api/render',
    tags: ['Render'],
    summary: 'Gambar QRIS dari template (POST)',
    description:
      'Versi lengkap: kustomisasi field, warna, logo, dan **template JSON buatan sendiri** (`template` berupa objek). ' +
      'Elemen: `rect`, `circle`, `path`, `text`, `image`, `qr`; teks dapat memakai binding `{{merchantName}}`, `{{nmid}}`, `{{amount}}`, `{{colors.primary}}`, `{{assets.qris}}`, `{{logo}}`.',
    request: { body: { required: true, content: { 'application/json': { schema: RenderBody } } } },
    responses: { 200: { description: 'Gambar', content: imageContent }, ...errorResponses },
  }),
  async (c) => {
    const { qris, ...rest } = c.req.valid('json')
    return (await respondRender(qris, rest as RenderParams, 'no-store')) as never
  },
)

// POST /api/parse
app.openapi(
  createRoute({
    method: 'post',
    path: '/api/parse',
    tags: ['QRIS'],
    summary: 'Parse & validasi payload QRIS',
    request: { body: { required: true, content: { 'application/json': { schema: ParseBody } } } },
    responses: {
      200: {
        description: 'Hasil parse',
        content: {
          'application/json': {
            schema: z.object({ valid: z.boolean(), errors: z.array(z.string()), info: z.unknown().nullable() }).openapi('ParseResponse'),
          },
        },
      },
      ...errorResponses,
    },
  }),
  (c) => {
    const { qris } = c.req.valid('json')
    const { valid, errors } = validateQRIS(qris)
    let info: unknown = null
    try {
      info = parseQRIS(qris)
    } catch {
      /* sudah tercatat di errors */
    }
    return c.json({ valid, errors, info }, 200)
  },
)

// ---------- meta ----------
app.doc31('/api/openapi.json', (c) => ({
  openapi: '3.1.0',
  info: {
    title: 'qristifier API',
    version: '0.1.0',
    description:
      'Ubah payload QRIS menjadi gambar siap pakai dengan template. Stateless — payload dan logo tidak disimpan. ' +
      `Dengan memakai API ini Anda menyetujui syarat penggunaan di ${new URL(LEGAL_PATH, c.req.url).href}. ` +
      'Gunakan hanya QRIS milik Anda sendiri atau yang Anda berwenang gunakan.',
    license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
  },
  servers: [{ url: new URL(c.req.url).origin }],
}))

app.get('/api/docs', Scalar({ url: '/api/openapi.json', pageTitle: 'qristifier API Playground' }))

app.get('/api', (c) =>
  c.json({
    name: 'qristifier',
    version: '0.1.0',
    docs: new URL('/api/docs', c.req.url).href,
    openapi: new URL('/api/openapi.json', c.req.url).href,
    terms: new URL(LEGAL_PATH, c.req.url).href,
  }),
)

app.all('/api/*', (c) => c.json({ error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan' } }, 404))

// Selain /api/* dilayani oleh static assets (landing).
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
