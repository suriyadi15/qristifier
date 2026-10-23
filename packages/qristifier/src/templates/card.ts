import type { TemplateSpec } from '../types'

export const card: TemplateSpec = {
  id: 'card',
  name: 'Kartu Meja',
  description: 'Kartu landscape (kasir/meja): identitas merchant di kiri, QR di kanan. Logo merchant tampil sebagai lingkaran.',
  width: 1050,
  height: 600,
  theme: 'merah',
  fields: [
    { key: 'subtitle', label: 'Subjudul', type: 'text', default: 'Terima semua pembayaran QRIS' },
    { key: 'showNmid', label: 'Tampilkan NMID', type: 'boolean', default: true },
  ],
  elements: [
    { type: 'rect', x: 0, y: 0, w: 1050, h: 600, fill: '{{colors.primary}}', gradient: { from: '{{colors.primary}}', to: '{{colors.accent}}', angle: 120 } },
    { type: 'circle', cx: 960, cy: 40, r: 220, fill: '{{colors.onPrimary}}', opacity: 0.06 },
    { type: 'circle', cx: 80, cy: 640, r: 180, fill: '{{colors.onPrimary}}', opacity: 0.06 },
    { type: 'image', x: 60, y: 60, w: 110, h: 110, href: '{{logo}}', rx: 55 },
    { type: 'text', x: 60, y: 270, text: '{{merchantName}}', size: 54, weight: 800, fill: '{{colors.onPrimary}}', maxWidth: 520, maxLines: 3, upper: true },
    { type: 'text', x: 60, y: 460, text: '{{subtitle}}', size: 26, weight: 500, fill: '{{colors.onPrimary}}', opacity: 0.85, maxWidth: 520, maxLines: 2 },
    { type: 'text', x: 60, y: 548, text: 'NMID: {{nmid}}', size: 22, weight: 500, fill: '{{colors.onPrimary}}', opacity: 0.7, maxWidth: 520, if: 'showNmid' },
    { type: 'rect', x: 650, y: 50, w: 350, h: 500, rx: 28, fill: '#ffffff' },
    { type: 'qr', x: 670, y: 66, size: 310, bg: '#ffffff', radius: 14 },
    { type: 'text', x: 825, y: 440, text: '{{amount}}', size: 34, weight: 800, fill: '{{colors.primary}}', anchor: 'middle', maxWidth: 310, if: 'amount' },
    { type: 'text', x: 825, y: 440, text: 'SCAN UNTUK BAYAR', size: 22, weight: 800, fill: '{{colors.primary}}', anchor: 'middle', letterSpacing: 1.5, if: '!amount' },
    { type: 'image', x: 765, y: 468, w: 120, h: 46, href: '{{assets.qris}}' },
  ],
}
