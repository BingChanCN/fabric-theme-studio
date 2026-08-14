/**
 * Color Science & Smart Palette Generation Utilities
 *
 * Implements WCAG 2.1 relative luminance, contrast calculations, HSL/RGB math,
 * color harmony generators, 1-click theme token derivation, and image color extraction.
 */

export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface HslColor {
  h: number // 0 ~ 360
  s: number // 0 ~ 100
  l: number // 0 ~ 100
}

export type HarmonyMode =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'split-complementary'
  | 'monochromatic'

/**
 * Normalizes hex string into standard 6-character `#rrggbb` format.
 */
export function normalizeHex(hex: string): string {
  const clean = hex.trim().replace(/^#/, '')
  if (clean.length === 3) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`.toLowerCase()
  }
  if (clean.length === 6 || clean.length === 8) {
    return `#${clean.slice(0, 6)}`.toLowerCase()
  }
  return '#000000'
}

/**
 * Converts Hex string to RGB object.
 */
export function hexToRgb(hex: string): RgbColor {
  const normalized = normalizeHex(hex)
  const num = parseInt(normalized.slice(1), 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

/**
 * Converts RGB numbers to Hex string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const cr = clamp(r)
  const cg = clamp(g)
  const cb = clamp(b)
  return `#${((1 << 24) + (cr << 16) + (cg << 8) + cb).toString(16).slice(1)}`.toLowerCase()
}

/**
 * Converts RGB to HSL.
 */
export function rgbToHsl(r: number, g: number, b: number): HslColor {
  const nr = r / 255
  const ng = g / 255
  const nb = b / 255

  const max = Math.max(nr, ng, nb)
  const min = Math.min(nr, ng, nb)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case nr:
        h = (ng - nb) / d + (ng < nb ? 6 : 0)
        break
      case ng:
        h = (nb - nr) / d + 2
        break
      case nb:
        h = (nr - ng) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Converts HSL to RGB.
 */
export function hslToRgb(h: number, s: number, l: number): RgbColor {
  const nh = ((h % 360) + 360) % 360 / 360
  const ns = Math.max(0, Math.min(100, s)) / 100
  const nl = Math.max(0, Math.min(100, l)) / 100

  if (ns === 0) {
    const val = Math.round(nl * 255)
    return { r: val, g: val, b: val }
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let nt = t
    if (nt < 0) nt += 1
    if (nt > 1) nt -= 1
    if (nt < 1 / 6) return p + (q - p) * 6 * nt
    if (nt < 1 / 2) return q
    if (nt < 2 / 3) return p + (q - p) * (2 / 3 - nt) * 6
    return p
  }

  const q = nl < 0.5 ? nl * (1 + ns) : nl + ns - nl * ns
  const p = 2 * nl - q

  const r = hue2rgb(p, q, nh + 1 / 3)
  const g = hue2rgb(p, q, nh)
  const b = hue2rgb(p, q, nh - 1 / 3)

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

/**
 * Converts HSL to Hex.
 */
export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l)
  return rgbToHex(r, g, b)
}

/**
 * Adjusts color brightness / lightness in HSL space.
 */
export function adjustLightness(hex: string, deltaPercent: number): string {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const newL = Math.max(0, Math.min(100, hsl.l + deltaPercent))
  return hslToHex(hsl.h, hsl.s, newL)
}

/**
 * Adjusts color saturation in HSL space.
 */
export function adjustSaturation(hex: string, deltaPercent: number): string {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const newS = Math.max(0, Math.min(100, hsl.s + deltaPercent))
  return hslToHex(hsl.h, newS, hsl.l)
}

/**
 * Computes WCAG 2.1 relative luminance (0 for pure black, 1 for pure white).
 */
export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const sRGB = [r / 255, g / 255, b / 255]
  const linear = sRGB.map(val => (val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)))
  const l0 = linear[0] ?? 0
  const l1 = linear[1] ?? 0
  const l2 = linear[2] ?? 0
  return 0.2126 * l0 + 0.7152 * l1 + 0.0722 * l2
}

/**
 * Computes WCAG 2.1 contrast ratio between two hex colors (range 1:1 ~ 21:1).
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1)
  const lum2 = getRelativeLuminance(hex2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  const ratio = (brightest + 0.05) / (darkest + 0.05)
  return Number(ratio.toFixed(2))
}

/**
 * Evaluates WCAG compliance grade for given contrast ratio.
 */
export function getWcagGrade(ratio: number): 'AAA' | 'AA' | 'FAIL' {
  if (ratio >= 7.0) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  return 'FAIL'
}

/**
 * Generates harmonic palette based on seed color.
 */
export function generateHarmony(seedHex: string, mode: HarmonyMode): string[] {
  const rgb = hexToRgb(seedHex)
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)

  switch (mode) {
    case 'complementary':
      return [
        seedHex,
        hslToHex((h + 180) % 360, s, l),
        hslToHex((h + 180) % 360, Math.max(20, s - 20), Math.min(85, l + 15)),
        hslToHex(h, Math.max(20, s - 15), Math.max(15, l - 15)),
      ]
    case 'analogous':
      return [
        seedHex,
        hslToHex((h + 30) % 360, s, l),
        hslToHex((h - 30 + 360) % 360, s, l),
        hslToHex((h + 60) % 360, s, Math.min(90, l + 10)),
      ]
    case 'triadic':
      return [
        seedHex,
        hslToHex((h + 120) % 360, s, l),
        hslToHex((h + 240) % 360, s, l),
        hslToHex((h + 120) % 360, Math.max(30, s - 10), Math.min(85, l + 15)),
      ]
    case 'split-complementary':
      return [
        seedHex,
        hslToHex((h + 150) % 360, s, l),
        hslToHex((h + 210) % 360, s, l),
        hslToHex(h, Math.max(20, s - 20), Math.min(80, l + 20)),
      ]
    case 'monochromatic':
    default:
      return [
        seedHex,
        hslToHex(h, s, Math.min(92, l + 25)),
        hslToHex(h, Math.min(100, s + 15), Math.max(12, l - 25)),
        hslToHex(h, Math.max(10, s - 30), Math.min(85, l + 12)),
      ]
  }
}

export interface DerivedThemeOptions {
  mode?: 'dark' | 'light'
  harmony?: HarmonyMode
  name?: string
  id?: string
}

export interface DerivedThemeTokens {
  id: string
  name: string
  isDark: boolean
  tokens: Record<string, string>
}

/**
 * Derives a full set of DSH --dsw-* semantic tokens from a single seed color.
 * Automatically computes contrasting layers, text labels, borders, and states.
 */
export function deriveThemeFromSeed(seedHex: string, options?: DerivedThemeOptions): DerivedThemeTokens {
  const isDark = options?.mode !== 'light'
  const rgb = hexToRgb(seedHex)
  const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b)

  // Primary brand color
  const brandPrimary = normalizeHex(seedHex)
  const brandHover = adjustLightness(brandPrimary, isDark ? 8 : -8)
  const brandActive = adjustLightness(brandPrimary, isDark ? -8 : 8)
  const brandSubtle = hslToHex(h, Math.min(60, s), isDark ? 16 : 94)

  // Background hierarchy
  let bgBase: string
  let bgLayer1: string
  let bgLayer2: string
  let bgLayer3: string
  let bgSubtle: string

  // Text hierarchy
  let labelPrimary: string
  let labelSecondary: string
  let labelTertiary: string
  let labelMuted: string

  // Border hierarchy
  let borderL1: string
  let borderL2: string
  let borderL3: string

  if (isDark) {
    // Dark theme backgrounds: dark tinted bases
    const bgSat = Math.min(25, Math.round(s * 0.25))
    bgBase = hslToHex(h, bgSat, 8)
    bgLayer1 = hslToHex(h, bgSat, 12)
    bgLayer2 = hslToHex(h, bgSat, 16)
    bgLayer3 = hslToHex(h, bgSat, 21)
    bgSubtle = hslToHex(h, bgSat, 14)

    // Dark theme text: high contrast whites
    labelPrimary = '#ffffff'
    labelSecondary = hslToHex(h, Math.min(20, s * 0.2), 75)
    labelTertiary = hslToHex(h, Math.min(15, s * 0.15), 55)
    labelMuted = hslToHex(h, Math.min(10, s * 0.1), 40)

    // Dark theme borders
    borderL1 = `rgba(255, 255, 255, 0.08)`
    borderL2 = `rgba(255, 255, 255, 0.14)`
    borderL3 = `rgba(255, 255, 255, 0.22)`
  } else {
    // Light theme backgrounds: clean tinted light surfaces
    const bgSat = Math.min(30, Math.round(s * 0.2))
    bgBase = hslToHex(h, bgSat, 98)
    bgLayer1 = hslToHex(h, bgSat, 100)
    bgLayer2 = hslToHex(h, bgSat, 95)
    bgLayer3 = hslToHex(h, bgSat, 91)
    bgSubtle = hslToHex(h, bgSat, 94)

    // Light theme text: deep contrasting darks
    labelPrimary = hslToHex(h, Math.min(30, s * 0.3), 10)
    labelSecondary = hslToHex(h, Math.min(20, s * 0.2), 35)
    labelTertiary = hslToHex(h, Math.min(15, s * 0.15), 55)
    labelMuted = hslToHex(h, Math.min(10, s * 0.1), 70)

    // Light theme borders
    borderL1 = `rgba(0, 0, 0, 0.06)`
    borderL2 = `rgba(0, 0, 0, 0.12)`
    borderL3 = `rgba(0, 0, 0, 0.20)`
  }

  // State colors (Success, Warning, Danger, Info)
  const stateSuccess = isDark ? '#34d399' : '#059669'
  const stateWarning = isDark ? '#fbbf24' : '#d97706'
  const stateDanger = isDark ? '#f87171' : '#dc2626'
  const stateInfo = brandPrimary

  const tokens: Record<string, string> = {
    // Core semantic alias tokens
    '--dsw-alias-bg-base': bgBase,
    '--dsw-alias-bg-layer-1': bgLayer1,
    '--dsw-alias-bg-layer-2': bgLayer2,
    '--dsw-alias-bg-layer-3': bgLayer3,
    '--dsw-alias-bg-subtle': bgSubtle,

    '--dsw-alias-label-primary': labelPrimary,
    '--dsw-alias-label-secondary': labelSecondary,
    '--dsw-alias-label-tertiary': labelTertiary,
    '--dsw-alias-label-muted': labelMuted,

    '--dsw-alias-border-l1': borderL1,
    '--dsw-alias-border-l2': borderL2,
    '--dsw-alias-border-l3': borderL3,

    '--dsw-alias-brand-primary': brandPrimary,
    '--dsw-alias-brand-hover': brandHover,
    '--dsw-alias-brand-active': brandActive,
    '--dsw-alias-brand-subtle': brandSubtle,

    '--dsw-alias-state-success': stateSuccess,
    '--dsw-alias-state-warning': stateWarning,
    '--dsw-alias-state-danger': stateDanger,
    '--dsw-alias-state-info': stateInfo,

    '--dsw-alias-interactive-bg-hover': isDark ? `rgba(255, 255, 255, 0.06)` : `rgba(0, 0, 0, 0.04)`,
    '--dsw-alias-interactive-bg-active': isDark ? `rgba(255, 255, 255, 0.12)` : `rgba(0, 0, 0, 0.08)`,

    // Specific & Static namespaces
    '--dsw-specific-card-bg': bgLayer1,
    '--dsw-specific-sidebar-bg': bgBase,
    '--dsw-specific-input-bg': bgLayer2,
    '--dsw-static-black': '#000000',
    '--dsw-static-white': '#ffffff',

    // Color aliases
    '--dsw-color-bg-primary': bgBase,
    '--dsw-color-bg-secondary': bgLayer1,
    '--dsw-color-text-primary': labelPrimary,
    '--dsw-color-text-secondary': labelSecondary,
    '--dsw-color-border-primary': borderL2,
    '--dsw-color-accent-primary': brandPrimary,
  }

  const id = options?.id ?? `generated-${Date.now()}`
  const name = options?.name ?? `Smart ${isDark ? 'Dark' : 'Light'} Palette`

  return {
    id,
    name,
    isDark,
    tokens,
  }
}

/**
 * Fast dominant color extraction from raw RGBA pixel data.
 * Clusters pixels into top dominant color swatches.
 */
export function extractColorsFromImageData(
  imageData: { data: Uint8ClampedArray | number[]; width: number; height: number },
  count = 5,
): string[] {
  const { data, width, height } = imageData
  const totalPixels = width * height
  if (totalPixels === 0) return ['#4176e6']

  // Downsample to max 1000 pixels for fast analysis
  const step = Math.max(1, Math.floor(totalPixels / 1000)) * 4
  const colorBuckets = new Map<string, number>()

  for (let i = 0; i < data.length; i += step) {
    const r = data[i] ?? 0
    const g = data[i + 1] ?? 0
    const b = data[i + 2] ?? 0
    const a = data[i + 3] ?? 255

    // Ignore transparent and nearly extreme pure black/white
    if (a < 128) continue
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    if (lum < 0.03 || lum > 0.97) continue

    // Quantize to 5-bit color space (32 levels per channel)
    const qr = Math.round(r / 8) * 8
    const qg = Math.round(g / 8) * 8
    const qb = Math.round(b / 8) * 8
    const hex = rgbToHex(qr, qg, qb)

    colorBuckets.set(hex, (colorBuckets.get(hex) ?? 0) + 1)
  }

  if (colorBuckets.size === 0) return ['#4176e6']

  const sorted = Array.from(colorBuckets.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])

  return sorted.slice(0, count)
}
