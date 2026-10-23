import type { Colors } from './types'

export const themes: Record<string, Omit<Colors, 'onPrimary' | 'onAccent'>> = {
  merah: { primary: '#d71920', accent: '#1b2a5c', background: '#ffffff', text: '#111827', muted: '#6b7280', qr: '#111111', qrBg: '#ffffff' },
  biru: { primary: '#1d4ed8', accent: '#0f172a', background: '#ffffff', text: '#0f172a', muted: '#64748b', qr: '#0f172a', qrBg: '#ffffff' },
  hijau: { primary: '#059669', accent: '#064e3b', background: '#ffffff', text: '#052e16', muted: '#4b5563', qr: '#052e16', qrBg: '#ffffff' },
  oranye: { primary: '#ea580c', accent: '#431407', background: '#fffaf5', text: '#1c1917', muted: '#78716c', qr: '#1c1917', qrBg: '#ffffff' },
  gelap: { primary: '#38bdf8', accent: '#1e293b', background: '#0f172a', text: '#f8fafc', muted: '#94a3b8', qr: '#0f172a', qrBg: '#ffffff' },
  monokrom: { primary: '#111827', accent: '#374151', background: '#ffffff', text: '#111827', muted: '#6b7280', qr: '#000000', qrBg: '#ffffff' },
}

export const themeNames = Object.keys(themes)

const SAFE_COLOR = /^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\)|none|transparent)$/i

/** Kembalikan `value` bila aman dipakai sebagai warna SVG, selain itu `fallback`. */
export function safeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && SAFE_COLOR.test(value.trim()) ? value.trim() : fallback
}

function luminance(hex: string): number {
  let h = hex.replace('#', '')
  if (h.length === 3) h = [...h].map((c) => c + c).join('')
  if (!/^[0-9a-f]{6}/i.test(h)) return 0
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const onColor = (bg: string) => (luminance(bg) > 0.4 ? '#111827' : '#ffffff')

export function resolveColors(theme: string | undefined, overrides: Partial<Colors> | undefined): Colors {
  const base = themes[theme ?? 'merah'] ?? themes.merah!
  const c = { ...base } as Colors
  for (const k of Object.keys(base) as (keyof typeof base)[]) {
    c[k] = safeColor(overrides?.[k], base[k])
  }
  c.onPrimary = safeColor(overrides?.onPrimary, onColor(c.primary))
  c.onAccent = safeColor(overrides?.onAccent, onColor(c.accent))
  return c
}
