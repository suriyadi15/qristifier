import type { TemplateSpec } from '../types'

export const minimal: TemplateSpec = {
  id: 'minimal',
  name: 'Minimal',
  description: 'QR dan nama merchant saja di latar polos. Cocok untuk dipasang di struk, menu, atau media lain.',
  width: 800,
  height: 1000,
  theme: 'monokrom',
  fields: [
    { key: 'hint', label: 'Teks ajakan (tanpa nominal)', type: 'text', default: 'Scan untuk membayar' },
    { key: 'footer', label: 'Footer', type: 'text', default: 'QRIS' },
  ],
  elements: [
    { type: 'rect', x: 0, y: 0, w: 800, h: 1000, fill: '{{colors.background}}' },
    { type: 'text', x: 400, y: 130, text: '{{merchantName}}', size: 46, weight: 800, fill: '{{colors.text}}', anchor: 'middle', maxWidth: 680, maxLines: 2 },
    { type: 'qr', x: 120, y: 210, size: 560, radius: 24, quiet: 1 },
    { type: 'text', x: 400, y: 860, text: '{{amount}}', size: 52, weight: 800, fill: '{{colors.primary}}', anchor: 'middle', if: 'amount' },
    { type: 'text', x: 400, y: 855, text: '{{hint}}', size: 30, weight: 500, fill: '{{colors.muted}}', anchor: 'middle', maxWidth: 680, if: '!amount' },
    { type: 'text', x: 400, y: 940, text: '{{footer}}', size: 22, weight: 700, fill: '{{colors.muted}}', anchor: 'middle', letterSpacing: 4 },
  ],
}
