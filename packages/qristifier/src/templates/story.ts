import type { TemplateSpec } from '../types'

export const story: TemplateSpec = {
  id: 'story',
  name: 'Story 9:16',
  description: 'Ukuran 1080×1920 untuk story Instagram/WhatsApp, latar gradasi warna tema.',
  width: 1080,
  height: 1920,
  theme: 'merah',
  fields: [
    { key: 'title', label: 'Judul', type: 'text', default: 'Bayar Lebih Mudah' },
    { key: 'hint', label: 'Teks bawah QR (tanpa nominal)', type: 'text', default: 'Scan dengan aplikasi pembayaran apa pun' },
    { key: 'footer', label: 'Footer', type: 'text', default: 'Semua e-wallet & mobile banking' },
  ],
  elements: [
    { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '{{colors.primary}}', gradient: { from: '{{colors.primary}}', to: '{{colors.accent}}', angle: 160 } },
    { type: 'circle', cx: 980, cy: 200, r: 300, fill: '{{colors.onPrimary}}', opacity: 0.06 },
    { type: 'circle', cx: 60, cy: 1700, r: 340, fill: '{{colors.onPrimary}}', opacity: 0.06 },
    { type: 'text', x: 540, y: 300, text: '{{title}}', size: 92, weight: 900, fill: '{{colors.onPrimary}}', anchor: 'middle', maxWidth: 920, letterSpacing: -1 },
    { type: 'text', x: 540, y: 520, text: '{{merchantName}}', size: 60, weight: 700, fill: '{{colors.onPrimary}}', anchor: 'middle', maxWidth: 900, maxLines: 2, upper: true, opacity: 0.95 },
    { type: 'rect', x: 140, y: 640, w: 800, h: 800, rx: 56, fill: '#ffffff' },
    { type: 'qr', x: 180, y: 680, size: 720, bg: '#ffffff', radius: 28 },
    { type: 'text', x: 540, y: 1548, text: '{{amount}}', size: 84, weight: 900, fill: '{{colors.onPrimary}}', anchor: 'middle', if: 'amount' },
    { type: 'text', x: 540, y: 1546, text: '{{hint}}', size: 34, weight: 500, fill: '{{colors.onPrimary}}', anchor: 'middle', maxWidth: 900, opacity: 0.9, if: '!amount' },
    { type: 'rect', x: 340, y: 1650, w: 400, h: 100, rx: 50, fill: '#ffffff' },
    { type: 'image', x: 375, y: 1665, w: 200, h: 70, href: '{{assets.qris}}' },
    { type: 'image', x: 600, y: 1660, w: 80, h: 80, href: '{{assets.gpn}}' },
    { type: 'text', x: 540, y: 1840, text: '{{footer}}', size: 30, weight: 500, fill: '{{colors.onPrimary}}', anchor: 'middle', maxWidth: 900, opacity: 0.85 },
  ],
}
