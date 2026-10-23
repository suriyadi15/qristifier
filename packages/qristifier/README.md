# qristifier

Ubah payload QRIS (statis, dinamis, atau teks bebas) menjadi **gambar siap cetak dan promosi** — standee gaya GPN, poster, kartu meja, stiker, dan story — dengan template yang bisa dikustom.

> ⚠️ **Disclaimer:** proyek independen, tidak berafiliasi dengan Bank Indonesia/ASPI/penyedia pembayaran mana pun. Logo QRIS dan GPN adalah merek milik pemiliknya dan disertakan hanya untuk referensi tampilan. Gunakan hanya QRIS milik Anda atau yang Anda berwenang gunakan. Tanpa jaminan. Lihat [DISCLAIMER.md](./DISCLAIMER.md).

## Instalasi

```bash
npm i qristifier
npm i @resvg/resvg-wasm   # opsional, hanya untuk PNG (qristifier/png)
```

Dependensi: [`qrisnamis`](https://www.npmjs.com/package/qrisnamis) (parse + QRIS statis → dinamis) dan [`uqr`](https://github.com/unjs/uqr) (matriks QR). Jalan di Node, Bun, browser, dan Cloudflare Workers.

## Mulai cepat

```ts
import { renderQRIS } from 'qristifier'

const svg = renderQRIS(payload, { template: 'gpn' }) // string SVG
```

Nama merchant, kota, NMID, dan nominal terisi otomatis dari payload. Hasilnya string SVG yang bisa disimpan, dikirim sebagai `image/svg+xml`, atau dipasang langsung ke HTML.

### Dengan nominal (statis → dinamis)

```ts
renderQRIS(staticPayload, {
  template: 'poster',
  amount: 25000,
  referenceId: 'INV-0001',          // opsional (maks 25)
  fee: { type: 'fixed', value: 500 } // opsional: fixed | percent | prompt
})
```

### PNG

```ts
import { renderQRISPng } from 'qristifier/png'

const { png } = await renderQRISPng(payload, { template: 'story', width: 1080 })
```

PNG dirender dengan `@resvg/resvg-wasm` dan font Inter yang sudah disertakan. Di Node, wasm dimuat otomatis. Di Cloudflare Workers atau browser, panggil `initPng` sekali:

```ts
import { initPng } from 'qristifier/png'
import wasm from '@resvg/resvg-wasm/index_bg.wasm' // Workers/Wrangler
await initPng(wasm)
```

`svgToPng(svg, { width, background, fonts })` mengubah SVG hasil `renderQRIS` menjadi PNG.

## Template bawaan

| ID | Ukuran | Deskripsi |
|---|---|---|
| `gpn` | 840×1188 | Standee QRIS/GPN (A6): logo QRIS & GPN, nama merchant, NMID |
| `minimal` | 800×1000 | QR + nama merchant di latar polos |
| `card` | 1050×600 | Kartu meja landscape; logo merchant bulat |
| `poster` | 1000×1414 | Poster A5 "Scan & Bayar" |
| `sticker` | 600×680 | Stiker bersudut membulat |
| `story` | 1080×1920 | Story Instagram/WhatsApp, latar gradasi |

`listTemplates()` mengembalikan semuanya; `getTemplate(id)` mengambil satu.

## Kustomisasi

Tiga lapis, makin dalam makin bebas.

### 1. Opsi umum (`RenderOptions`)

| Opsi | Keterangan |
|---|---|
| `template` | ID template atau objek spec. Default `gpn`. |
| `amount`, `fee`, `referenceId` | Mengubah payload statis menjadi dinamis. `fee`/`referenceId` butuh `amount`. |
| `strict` | Payload wajib QRIS valid (default `true`). `false` merender teks bebas. |
| `merchantName`, `city`, `nmid` | Override data hasil parse. |
| `theme` | `merah`, `biru`, `hijau`, `oranye`, `gelap`, `monokrom`. |
| `colors` | Override `primary`, `accent`, `background`, `text`, `muted`, `qr`, `qrBg`. |
| `qrStyle` | `square`, `dots`, `rounded`. |
| `logo` | Logo di tengah QR (data URL base64). ECC otomatis naik ke H. |
| `logoBackground` | `solid` (default): kotak latar di bawah logo. `none`: tanpa latar, lubang bulat; cocok untuk logo transparan (mis. SVG). |
| `fields` | Nilai field template, mis. `{ title, subtitle, footer, showNmid }`. |
| `scale` | Pengali atribut `width`/`height` SVG (viewBox tetap). |

### 2. Field template

Setiap template mendeklarasikan `fields` (judul, footer, dsb.). `fieldsOf(template)` mengembalikan daftar lengkap (termasuk `theme`, `qrStyle`, `logo`), lengkap dengan label dan default, sehingga mudah dipakai untuk membuat form.

```ts
import { fieldsOf, getTemplate } from 'qristifier'
fieldsOf(getTemplate('gpn')).map((f) => f.key) // title, hint, footer, showNmid, theme, qrStyle, logo
```

### 3. Template sendiri

**Turunkan dari preset** dengan `extendTemplate`:

```ts
import { extendTemplate, renderQRIS } from 'qristifier'

const kafe = extendTemplate('minimal', {
  id: 'kafe',
  fields: [{ key: 'footer', label: 'Footer', type: 'text', default: 'Kopi Senja' }],
  appendElements: [{ type: 'text', x: 400, y: 80, text: 'Meja {{table}}', size: 28 }],
})
renderQRIS(payload, { template: kafe, fields: { table: '5' } })
```

**Atau tulis spec JSON** (`TemplateSpec`). Semua preset memakai format ini, jadi bisa disalin lalu diubah:

```ts
import { defineTemplate, renderQRIS } from 'qristifier'

const spec = defineTemplate({
  id: 'mini', name: 'Mini', description: '',
  width: 600, height: 700,
  elements: [
    { type: 'rect', x: 0, y: 0, w: 600, h: 700, fill: '{{colors.background}}' },
    { type: 'text', x: 300, y: 90, text: '{{merchantName}}', size: 44, weight: 800, anchor: 'middle', maxWidth: 520, fill: '{{colors.text}}' },
    { type: 'qr', x: 60, y: 140, size: 480, radius: 24 },
  ],
})
```

Elemen: `rect` (opsi `gradient`), `circle`, `path`, `text`, `image`, `qr`. Semua elemen mendukung `if` (nama variabel; awali `!` untuk kebalikan) dan `opacity`.

Teks mendukung `maxWidth` + `maxLines`: teks dibungkus lalu diperkecil otomatis agar muat.

**Binding** `{{...}}` yang tersedia: `merchantName`, `city`, `nmid`, `amount` (mis. `Rp15.000`), `amountRaw`, `payload`, `logo`, `qrStyle`, `colors.*`, `assets.qris`, `assets.gpn`, serta semua key field template.

`defineTemplate` memvalidasi spec dari sumber tak tepercaya (batas ukuran/jumlah elemen, `path` aman, gambar hanya data URL). Template kode dengan fungsi `render(ctx)` juga didukung untuk kebebasan penuh, tetapi tidak bisa dikirim lewat API.

## Keamanan

- Teks selalu di-escape; warna dan `path` divalidasi.
- Gambar (`logo`, `image`) hanya diterima sebagai data URL `png/jpeg/webp/gif/svg` base64. URL eksternal ditolak oleh library (API server dapat mengunduhnya dengan batas ukuran, lalu mengubahnya jadi data URL).

## Error

`QristifierError` dengan `code`: `INVALID_QRIS`, `INVALID_INPUT`, `INVALID_TEMPLATE`, `UNKNOWN_TEMPLATE`, `PNG_NOT_READY`.

## API & situs

Generator web, API HTTP gratis (`/api/render`, `/api/templates`), dan playground Scalar tersedia di [qristifier.pages.dev](https://qristifier.pages.dev).

## Lisensi

MIT. Font Inter © The Inter Project Authors (SIL OFL 1.1). Logo QRIS & GPN: merek milik pemiliknya. Baca juga [DISCLAIMER.md](./DISCLAIMER.md).
