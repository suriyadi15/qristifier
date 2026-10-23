import { describe, expect, test } from 'bun:test'
import { parseQRIS } from 'qrisnamis'
import {
  QristifierError,
  defineTemplate,
  extendTemplate,
  fieldsOf,
  listTemplates,
  qrMatrix,
  renderQRIS,
  renderQRISDetailed,
} from '../src'
import { STATIC_QRIS } from './fixture'

const PNG_DOT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('templates', () => {
  for (const t of listTemplates()) {
    test(`${t.id} menghasilkan SVG berukuran ${t.width}x${t.height}`, () => {
      const svg = renderQRIS(STATIC_QRIS, { template: t.id })
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg).toContain(`viewBox="0 0 ${t.width} ${t.height}"`)
      expect(svg).toContain('TOKO TEST'.toUpperCase().slice(0, 4))
      expect(svg.endsWith('</svg>')).toBe(true)
    })
  }

  test('field umum selalu ada: theme, qrStyle, logo', () => {
    const keys = fieldsOf(listTemplates()[0]!).map((f) => f.key)
    expect(keys).toEqual(expect.arrayContaining(['theme', 'qrStyle', 'logo']))
  })
})

describe('payload', () => {
  test('amount mengubah statis menjadi dinamis dan menampilkan nominal', () => {
    const r = renderQRISDetailed(STATIC_QRIS, { amount: 15000 })
    expect(parseQRIS(r.payload).isDynamic).toBe(true)
    expect(r.svg).toContain('Rp15.000')
  })

  test('merchant diisi otomatis dan bisa di-override', () => {
    expect(renderQRISDetailed(STATIC_QRIS).merchant.name).toBe('TOKO TEST')
    expect(renderQRISDetailed(STATIC_QRIS, { merchantName: 'Warung Baru' }).merchant.name).toBe('Warung Baru')
  })

  test('strict menolak payload bukan QRIS; strict:false merender teks bebas', () => {
    expect(() => renderQRIS('hello')).toThrow(QristifierError)
    expect(renderQRIS('hello', { strict: false })).toContain('<svg')
  })

  test('fee/referenceId tanpa amount ditolak', () => {
    expect(() => renderQRIS(STATIC_QRIS, { referenceId: 'A1' })).toThrow(QristifierError)
  })
})

describe('kustomisasi', () => {
  test('nama merchant di-escape XML', () => {
    const svg = renderQRIS(STATIC_QRIS, { merchantName: '<b>&"x"</b>' })
    expect(svg).not.toContain('<b>')
    expect(svg.toLowerCase()).toContain('&lt;b&gt;')
  })

  test('field, tema, dan warna diterapkan', () => {
    const svg = renderQRIS(STATIC_QRIS, {
      template: 'gpn',
      theme: 'biru',
      colors: { primary: '#123456' },
      fields: { footer: 'FOOTER KUSTOM', title: 'Judul Baru' },
    })
    expect(svg).toContain('FOOTER KUSTOM')
    expect(svg).toContain('Judul Baru')
    expect(svg).toContain('#123456')
  })

  test('showNmid=false menyembunyikan NMID', () => {
    expect(renderQRIS(STATIC_QRIS, { fields: { showNmid: false } })).not.toContain('NMID')
    expect(renderQRIS(STATIC_QRIS)).toContain('NMID')
  })

  test('warna berbahaya diabaikan', () => {
    const svg = renderQRIS(STATIC_QRIS, { colors: { primary: '"/><script>x</script>' } })
    expect(svg).not.toContain('<script')
  })

  test('logo tengah menaikkan ECC dan menyertakan gambar; URL non-data ditolak', () => {
    const plain = qrMatrix(STATIC_QRIS, false).length
    const withLogo = qrMatrix(STATIC_QRIS, true).length
    expect(withLogo).toBeGreaterThanOrEqual(plain)
    expect(renderQRIS(STATIC_QRIS, { template: 'minimal', logo: PNG_DOT })).toContain(PNG_DOT)
    expect(() => renderQRIS(STATIC_QRIS, { logo: 'https://evil.test/x.png' })).toThrow(QristifierError)
  })

  test('logoBackground none: tanpa kotak latar, lubang bulat, logo tetap ada', () => {
    const solid = renderQRIS(STATIC_QRIS, { template: 'minimal', logo: PNG_DOT })
    const none = renderQRIS(STATIC_QRIS, { template: 'minimal', logo: PNG_DOT, logoBackground: 'none' })
    expect(none).toContain(PNG_DOT)
    expect(none).not.toContain('<clipPath')
    expect(solid).toContain('<clipPath')
    expect(none).not.toBe(solid)
  })

  test.each(['square', 'dots', 'rounded'] as const)('gaya QR %s', (qrStyle) => {
    expect(renderQRIS(STATIC_QRIS, { template: 'minimal', qrStyle })).toContain('<path')
  })

  test('scale mengubah width/height tapi bukan viewBox', () => {
    const svg = renderQRIS(STATIC_QRIS, { template: 'sticker', scale: 2 })
    expect(svg).toContain('width="1200" height="1360" viewBox="0 0 600 680"')
  })

  test('nama panjang dibungkus/diperkecil dan tidak error', () => {
    const svg = renderQRIS(STATIC_QRIS, { merchantName: 'PT SANGAT PANJANG SEKALI NAMA USAHA INDONESIA MAKMUR SENTOSA ABADI' })
    expect(svg).toContain('<tspan')
  })
})

describe('id SVG unik', () => {
  const ids = (svg: string) => [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]!)
  const refs = (svg: string) => [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]!)

  test('id tidak bentrok antar template yang di-inline di satu halaman', () => {
    const all = ['gpn', 'card', 'story', 'poster'].map((t) => renderQRIS(STATIC_QRIS, { template: t, logo: PNG_DOT }))
    const flat = all.flatMap(ids)
    expect(flat.length).toBeGreaterThan(0)
    expect(new Set(flat).size).toBe(flat.length)
    for (const svg of all) for (const r of refs(svg)) expect(ids(svg)).toContain(r)
  })

  test('output deterministik', () => {
    const a = renderQRIS(STATIC_QRIS, { template: 'story', logo: PNG_DOT })
    expect(renderQRIS(STATIC_QRIS, { template: 'story', logo: PNG_DOT })).toBe(a)
    expect(a).not.toContain('@@')
  })
})

describe('template kustom', () => {
  test('extendTemplate menimpa field dan menambah elemen', () => {
    const t = extendTemplate('minimal', {
      id: 'mine',
      fields: [{ key: 'footer', label: 'Footer', type: 'text', default: 'BUATAN SAYA' }],
      appendElements: [{ type: 'text', x: 10, y: 20, text: 'halo {{merchantName}}', size: 12 }],
    })
    const svg = renderQRIS(STATIC_QRIS, { template: t })
    expect(svg).toContain('BUATAN SAYA')
    expect(svg).toContain('halo TOKO TEST')
  })

  test('spec JSON valid dirender', () => {
    const t = defineTemplate({
      width: 400,
      height: 500,
      elements: [
        { type: 'rect', x: 0, y: 0, w: 400, h: 500, fill: '#fff' },
        { type: 'qr', x: 50, y: 50, size: 300 },
      ],
    })
    expect(renderQRIS(STATIC_QRIS, { template: t })).toContain('viewBox="0 0 400 500"')
  })

  test('spec invalid ditolak', () => {
    const base = { width: 400, height: 500 }
    expect(() => defineTemplate({ ...base, elements: [{ type: 'rect', x: 0, y: 0, w: 1, h: 1 }] })).toThrow(/qr/)
    expect(() => defineTemplate({ ...base, elements: [{ type: 'script' }] })).toThrow(QristifierError)
    expect(() => defineTemplate({ ...base, elements: [{ type: 'qr', x: 0, y: 0, size: 100 }, { type: 'path', d: '<x>' }] })).toThrow(QristifierError)
    expect(() => defineTemplate({ width: 99999, height: 1, elements: [] })).toThrow(QristifierError)
    expect(() => defineTemplate({ ...base, render: 'x', elements: [] })).toThrow(QristifierError)
  })

  test('template berfungsi render (kode) tetap dipercaya', () => {
    const t = defineTemplate({
      id: 'code', name: 'c', description: '', width: 10, height: 10,
      render: () => '<rect width="10" height="10"/>',
    })
    expect(renderQRIS(STATIC_QRIS, { template: t })).toContain('<rect width="10"')
  })
})
