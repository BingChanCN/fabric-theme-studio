import { describe, expect, it } from 'vitest'
import {
  adjustLightness,
  adjustSaturation,
  deriveThemeFromSeed,
  extractColorsFromImageData,
  generateHarmony,
  getContrastRatio,
  getRelativeLuminance,
  getWcagGrade,
  hexToRgb,
  hslToHex,
  hslToRgb,
  normalizeHex,
  rgbToHex,
  rgbToHsl,
} from '../src/color-science'

describe('color-science module', () => {
  it('normalizes hex strings correctly', () => {
    expect(normalizeHex('#fff')).toBe('#ffffff')
    expect(normalizeHex('#000')).toBe('#000000')
    expect(normalizeHex('4176e6')).toBe('#4176e6')
    expect(normalizeHex('#4176E6')).toBe('#4176e6')
    expect(normalizeHex('invalid')).toBe('#000000')
  })

  it('converts hex to rgb and rgb to hex accurately', () => {
    const rgb = hexToRgb('#4176e6')
    expect(rgb).toEqual({ r: 65, g: 118, b: 230 })
    expect(rgbToHex(65, 118, 230)).toBe('#4176e6')
  })

  it('converts between rgb and hsl roundtrip', () => {
    const hsl = rgbToHsl(65, 118, 230)
    expect(hsl.h).toBeGreaterThanOrEqual(220)
    expect(hsl.h).toBeLessThanOrEqual(225)
    expect(hsl.s).toBeGreaterThanOrEqual(75)

    const backToRgb = hslToRgb(hsl.h, hsl.s, hsl.l)
    expect(Math.abs(backToRgb.r - 65)).toBeLessThanOrEqual(2)
    expect(Math.abs(backToRgb.g - 118)).toBeLessThanOrEqual(2)
    expect(Math.abs(backToRgb.b - 230)).toBeLessThanOrEqual(2)

    const hex = hslToHex(hsl.h, hsl.s, hsl.l)
    expect(hex).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('adjusts lightness and saturation', () => {
    const lighter = adjustLightness('#4176e6', 10)
    expect(getRelativeLuminance(lighter)).toBeGreaterThan(getRelativeLuminance('#4176e6'))

    const saturated = adjustSaturation('#888888', 30)
    expect(saturated).not.toBe('#888888')
  })

  it('calculates WCAG 2.1 relative luminance and contrast ratio', () => {
    expect(getRelativeLuminance('#ffffff')).toBeCloseTo(1.0, 2)
    expect(getRelativeLuminance('#000000')).toBeCloseTo(0.0, 2)

    const blackOnWhite = getContrastRatio('#000000', '#ffffff')
    expect(blackOnWhite).toBe(21)
    expect(getWcagGrade(blackOnWhite)).toBe('AAA')

    const sameColor = getContrastRatio('#4176e6', '#4176e6')
    expect(sameColor).toBe(1)
    expect(getWcagGrade(sameColor)).toBe('FAIL')

    const whiteOnDeepBlue = getContrastRatio('#ffffff', '#121b2d')
    expect(whiteOnDeepBlue).toBeGreaterThan(10)
    expect(getWcagGrade(whiteOnDeepBlue)).toBe('AAA')
  })

  it('generates harmonic palettes for various modes', () => {
    const modes = ['complementary', 'analogous', 'triadic', 'split-complementary', 'monochromatic'] as const
    for (const mode of modes) {
      const palette = generateHarmony('#4176e6', mode)
      expect(palette).toHaveLength(4)
      for (const color of palette) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })

  it('derives a full cohesive dark theme from a single seed color', () => {
    const theme = deriveThemeFromSeed('#4176e6', { mode: 'dark', name: 'Test Dark Theme' })
    expect(theme.name).toBe('Test Dark Theme')
    expect(theme.isDark).toBe(true)
    expect(theme.tokens['--dsw-alias-brand-primary']).toBe('#4176e6')
    expect(theme.tokens['--dsw-alias-bg-base']).toMatch(/^#[0-9a-f]{6}$/)
    expect(theme.tokens['--dsw-alias-label-primary']).toBe('#ffffff')

    // Contrast between text and base background must meet WCAG AA (>= 4.5)
    const contrast = getContrastRatio(
      theme.tokens['--dsw-alias-label-primary']!,
      theme.tokens['--dsw-alias-bg-base']!,
    )
    expect(contrast).toBeGreaterThanOrEqual(7.0) // AAA compliant
  })

  it('derives a full cohesive light theme from a single seed color', () => {
    const theme = deriveThemeFromSeed('#4176e6', { mode: 'light', name: 'Test Light Theme' })
    expect(theme.name).toBe('Test Light Theme')
    expect(theme.isDark).toBe(false)
    expect(theme.tokens['--dsw-alias-brand-primary']).toBe('#4176e6')
    expect(theme.tokens['--dsw-alias-bg-base']).toMatch(/^#[0-9a-f]{6}$/)

    // Contrast between text and base background must meet WCAG AA
    const contrast = getContrastRatio(
      theme.tokens['--dsw-alias-label-primary']!,
      theme.tokens['--dsw-alias-bg-base']!,
    )
    expect(contrast).toBeGreaterThanOrEqual(4.5)
  })

  it('extracts dominant colors from image pixel array', () => {
    // 2x2 image with 2 red pixels and 2 blue pixels
    const width = 2
    const height = 2
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,   255, 0, 0, 255,
      0, 0, 255, 255,   0, 0, 255, 255,
    ])

    const colors = extractColorsFromImageData({ data, width, height }, 3)
    expect(colors.length).toBeGreaterThanOrEqual(1)
    for (const c of colors) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})
