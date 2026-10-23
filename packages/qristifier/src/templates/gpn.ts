import type { TemplateSpec } from '../types'

/** Standee gaya QRIS/GPN (A6 portrait). */
export const gpn: TemplateSpec = {
  id: 'gpn',
  name: 'Standee QRIS (GPN)',
  description: 'Standee klasik: logo QRIS & GPN, nama merchant, NMID, dan QR di tengah. Cocok dicetak A6.',
  width: 840,
  height: 1188,
  theme: 'merah',
  fields: [
    { key: 'title', label: 'Judul', type: 'text', default: 'QR Code Standar Pembayaran Nasional' },
    { key: 'hint', label: 'Teks ajakan (tanpa nominal)', type: 'text', default: 'Scan untuk membayar' },
    { key: 'footer', label: 'Footer', type: 'text', default: 'SATU QRIS UNTUK SEMUA PEMBAYARAN' },
    { key: 'showNmid', label: 'Tampilkan NMID', type: 'boolean', default: true },
  ],
  elements: [
    { type: 'rect', x: 0, y: 0, w: 840, h: 1188, fill: '{{colors.background}}' },
    { type: 'image', x: 60, y: 48, w: 250, h: 95, href: '{{assets.qris}}' },
    { type: 'image', x: 693, y: 38, w: 87, h: 110, href: '{{assets.gpn}}' },
    { type: 'rect', x: 0, y: 176, w: 840, h: 8, fill: '{{colors.primary}}' },
    { type: 'text', x: 420, y: 244, text: '{{title}}', size: 28, weight: 600, fill: '{{colors.muted}}', anchor: 'middle', maxWidth: 720 },
    { type: 'text', x: 420, y: 316, text: '{{merchantName}}', size: 54, weight: 800, fill: '{{colors.text}}', anchor: 'middle', maxWidth: 720, maxLines: 2, upper: true },
    { type: 'text', x: 420, y: 452, text: 'NMID: {{nmid}}', size: 26, weight: 500, fill: '{{colors.muted}}', anchor: 'middle', maxWidth: 720, if: 'showNmid' },
    { type: 'rect', x: 140, y: 480, w: 560, h: 560, rx: 32, fill: '{{colors.qrBg}}', stroke: '{{colors.primary}}', strokeWidth: 8 },
    { type: 'qr', x: 160, y: 500, size: 520, radius: 20 },
    { type: 'text', x: 420, y: 1095, text: '{{amount}}', size: 48, weight: 800, fill: '{{colors.primary}}', anchor: 'middle', if: 'amount' },
    { type: 'text', x: 420, y: 1090, text: '{{hint}}', size: 28, weight: 500, fill: '{{colors.muted}}', anchor: 'middle', maxWidth: 720, if: '!amount' },
    { type: 'rect', x: 0, y: 1128, w: 840, h: 60, fill: '{{colors.primary}}' },
    { type: 'text', x: 420, y: 1166, text: '{{footer}}', size: 21, weight: 700, fill: '{{colors.onPrimary}}', anchor: 'middle', letterSpacing: 1.5, maxWidth: 760 },
  ],
}
