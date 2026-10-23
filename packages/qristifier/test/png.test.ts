import { expect, test } from 'bun:test'
import { renderQRISPng } from '../src/png'
import { STATIC_QRIS } from './fixture'

test('renderQRISPng menghasilkan PNG dengan lebar yang diminta', async () => {
  const { png, width } = await renderQRISPng(STATIC_QRIS, { template: 'gpn', width: 420 })
  expect([...png.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  expect(new DataView(png.buffer, png.byteOffset).getUint32(16)).toBe(420)
  expect(width).toBe(840)
}, 20000)
