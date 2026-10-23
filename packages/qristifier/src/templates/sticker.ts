import type { TemplateSpec } from '../types'

export const sticker: TemplateSpec = {
  id: 'sticker',
  name: 'Stiker',
  description: 'Stiker persegi bersudut membulat dengan bingkai warna tema. Ringkas untuk ditempel di mesin, helm, atau galon.',
  width: 600,
  height: 680,
  theme: 'merah',
  fields: [{ key: 'tagline', label: 'Teks bawah', type: 'text', default: 'Bayar pakai QRIS' }],
  elements: [
    { type: 'rect', x: 5, y: 5, w: 590, h: 670, rx: 56, fill: '{{colors.background}}', stroke: '{{colors.primary}}', strokeWidth: 10 },
    { type: 'qr', x: 50, y: 48, size: 500, radius: 24, quiet: 1 },
    { type: 'text', x: 300, y: 604, text: '{{merchantName}}', size: 36, weight: 800, fill: '{{colors.text}}', anchor: 'middle', maxWidth: 500, upper: true },
    { type: 'text', x: 300, y: 644, text: '{{tagline}}', size: 22, weight: 600, fill: '{{colors.primary}}', anchor: 'middle', maxWidth: 500 },
  ],
}
