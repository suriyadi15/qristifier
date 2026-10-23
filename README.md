# qristifier

[![npm version](https://img.shields.io/npm/v/qristifier?logo=npm&color=cb3837)](https://www.npmjs.com/package/qristifier)
[![CI](https://img.shields.io/github/actions/workflow/status/suriyadi15/qristifier/ci.yml?branch=main&label=CI&logo=github)](https://github.com/suriyadi15/qristifier/actions/workflows/ci.yml)
[![npm downloads](https://img.shields.io/npm/dm/qristifier?logo=npm&color=cb3837)](https://www.npmjs.com/package/qristifier)
[![types](https://img.shields.io/npm/types/qristifier?logo=typescript&logoColor=white)](https://www.npmjs.com/package/qristifier)
[![license](https://img.shields.io/github/license/suriyadi15/qristifier)](./LICENSE)
[![stars](https://img.shields.io/github/stars/suriyadi15/qristifier?style=flat&logo=github)](https://github.com/suriyadi15/qristifier)
[![demo](https://img.shields.io/badge/demo-qristifier.pages.dev-f38020?logo=cloudflare&logoColor=white)](https://qristifier.pages.dev)

Ubah QRIS statis, dinamis, atau payload string menjadi **gambar siap pakai dan promosi** dengan berbagai template: standee gaya QRIS/GPN lengkap logo, poster, kartu meja, stiker, dan story. Library TypeScript, API gratis (Cloudflare Pages), dan generator web.

> ⚠️ **Disclaimer:** proyek independen, tidak berafiliasi dengan Bank Indonesia/ASPI/penyedia pembayaran mana pun. Logo QRIS dan GPN adalah merek milik pemiliknya dan hanya disertakan untuk referensi tampilan. Gunakan hanya QRIS milik Anda atau yang Anda berwenang gunakan. Tanpa jaminan. Lihat [DISCLAIMER.md](./DISCLAIMER.md).

```
packages/qristifier   library npm (SVG + PNG, template, validator)
apps/web              satu proyek Cloudflare Pages: API (Hono + OpenAPI + Scalar) + landing/generator (Astro)
```

Dibangun di atas [qrisnamis](https://github.com/suriyadi15/qrisnamis) untuk parse dan konversi QRIS statis → dinamis.

## Tautan

- **Situs & generator:** https://qristifier.pages.dev
- **API Playground (Scalar):** https://qristifier.pages.dev/api/docs · [OpenAPI](https://qristifier.pages.dev/api/openapi.json)
- **Dokumentasi library:** https://qristifier.pages.dev/docs
- **npm:** https://www.npmjs.com/package/qristifier
- **GitHub:** https://github.com/suriyadi15/qristifier · [Issues](https://github.com/suriyadi15/qristifier/issues)

## Pengembangan

```bash
bun install
bun run test          # test library
bun run build:lib     # build library (dist ESM + CJS + d.ts)
bun run dev           # build landing + wrangler pages dev di :8788
bun run typecheck
bun run deploy        # build landing + wrangler pages deploy
```

## Library

Dokumentasi lengkap: [packages/qristifier/README.md](./packages/qristifier/README.md) (juga tampil di `/docs`). Ringkas:

```ts
import { renderQRIS } from 'qristifier'
import { renderQRISPng } from 'qristifier/png' // opsional, butuh @resvg/resvg-wasm

const svg = renderQRIS(payload, { template: 'gpn' })
const { png } = await renderQRISPng(payload, {
  template: 'poster',
  amount: 25000,
  theme: 'biru',
  fields: { footer: 'Terima kasih!' },
})
```

Template: `gpn`, `minimal`, `card`, `poster`, `sticker`, `story`. Tiap template bisa dikustom lewat tema, warna, gaya QR, logo, dan field teks. Untuk bentuk sendiri, gunakan `extendTemplate` atau spec JSON (`defineTemplate`).

## API

Playground interaktif di `/api/docs`, spesifikasi OpenAPI di `/api/openapi.json`.

- `GET /api/templates` — daftar template, field, dan tema
- `GET /api/render?qris=…&template=gpn&amount=…&format=svg|png` — gambar langsung (cocok untuk `<img>`); `field.<key>=` dan `color.<key>=` untuk kustomisasi
- `POST /api/render` — JSON lengkap: `fields`, `colors`, `logo` (data URL atau URL https), dan template JSON sendiri
- `POST /api/parse` — validasi + info merchant

Catatan: batas CPU Workers gratis ±10 ms; render PNG di server bisa melewatinya. SVG ringan; untuk PNG besar gunakan generator di landing (canvas di browser) atau library.

## Rilis

- **npm:** push tag `v*` → workflow `release.yml` (butuh secret `NPM_TOKEN`).
- **Situs + API (Pages, https://qristifier.pages.dev):** push ke `main` → `deploy.yml` (butuh secret `CLOUDFLARE_API_TOKEN` dengan izin Cloudflare Pages: Edit, dan `CLOUDFLARE_ACCOUNT_ID`).

## Proyek terkait

- [**qrisnamis**](https://github.com/suriyadi15/qrisnamis) — library dan API untuk mengubah QRIS statis menjadi dinamis (dipakai qristifier).
- [**QRIS Hook**](https://github.com/suriyadi15/qrishook) — aplikasi Android yang meneruskan notifikasi pembayaran QRIS ke webhook Anda. Pasangan yang cocok: buat gambar QRIS dinamis dengan qristifier, konfirmasi pembayaran dengan QRIS Hook. [Website](https://qrishook.pages.dev/)

## Kontribusi

Issue dan pull request disambut di [GitHub](https://github.com/suriyadi15/qristifier). Jalankan `bun run test` dan `bun run typecheck` sebelum mengirim PR.

## Traktir

qristifier gratis dan open source. Kalau bermanfaat, traktir kopi lewat [Trakteer](https://trakteer.id/suriyadi15/tip) atau [GitHub Sponsors](https://github.com/sponsors/suriyadi15).

## Lisensi

MIT. Baca juga [DISCLAIMER.md](./DISCLAIMER.md). Font Inter © The Inter Project Authors (SIL OFL 1.1).
