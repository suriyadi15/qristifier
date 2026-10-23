import type { TemplateSpec } from '../types'

export const poster: TemplateSpec = {
  id: 'poster',
  name: 'Poster Promosi',
  description: 'Poster A5 dengan ajakan besar "Scan & Bayar", cocok ditempel di etalase atau kasir.',
  width: 1000,
  height: 1414,
  theme: 'merah',
  fields: [
    { key: 'title', label: 'Judul besar', type: 'text', default: 'SCAN & BAYAR' },
    { key: 'subtitle', label: 'Subjudul', type: 'text', default: 'Terima pembayaran dari semua aplikasi QRIS' },
    { key: 'hint', label: 'Teks bawah QR (tanpa nominal)', type: 'text', default: 'Pakai e-wallet atau mobile banking favoritmu' },
    { key: 'footer', label: 'Footer', type: 'text', default: 'Satu QRIS untuk semua' },
  ],
  elements: [
    { type: 'rect', x: 0, y: 0, w: 1000, h: 1414, fill: '{{colors.background}}' },
    { type: 'rect', x: 0, y: 0, w: 1000, h: 24, fill: '{{colors.primary}}' },
    { type: 'text', x: 500, y: 200, text: '{{title}}', size: 110, weight: 900, fill: '{{colors.primary}}', anchor: 'middle', maxWidth: 880, letterSpacing: -2 },
    { type: 'text', x: 500, y: 290, text: '{{subtitle}}', size: 30, weight: 500, fill: '{{colors.muted}}', anchor: 'middle', maxWidth: 820, maxLines: 2 },
    { type: 'text', x: 500, y: 378, text: '{{merchantName}}', size: 46, weight: 800, fill: '{{colors.text}}', anchor: 'middle', maxWidth: 860, maxLines: 2, upper: true },
    { type: 'rect', x: 140, y: 470, w: 720, h: 720, rx: 40, fill: '{{colors.qrBg}}', stroke: '{{colors.primary}}', strokeWidth: 12 },
    { type: 'qr', x: 166, y: 496, size: 668, radius: 24 },
    { type: 'text', x: 500, y: 1262, text: '{{amount}}', size: 76, weight: 900, fill: '{{colors.primary}}', anchor: 'middle', if: 'amount' },
    { type: 'text', x: 500, y: 1260, text: '{{hint}}', size: 28, weight: 500, fill: '{{colors.muted}}', anchor: 'middle', maxWidth: 860, if: '!amount' },
    { type: 'rect', x: 0, y: 1314, w: 1000, h: 100, fill: '{{colors.accent}}' },
    { type: 'rect', x: 70, y: 1334, w: 280, h: 60, rx: 30, fill: '#ffffff' },
    { type: 'image', x: 100, y: 1340, w: 130, h: 49, href: '{{assets.qris}}' },
    { type: 'image', x: 260, y: 1338, w: 52, h: 52, href: '{{assets.gpn}}' },
    { type: 'text', x: 930, y: 1372, text: '{{footer}}', size: 28, weight: 700, fill: '{{colors.onAccent}}', anchor: 'end', maxWidth: 520 },
  ],
}
