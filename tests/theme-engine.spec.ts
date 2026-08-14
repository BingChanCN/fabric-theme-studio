import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FabricThemeService } from '@dsh-do/fabric/client'
import {
  calculateContrastRatio,
  calculateLuminance,
  colorToRgba,
  deriveStateRamp,
  distinctSurface,
  evaluateContrastGrade,
  generateCssVariables,
  generateTokenDictionary,
  parseColorToRgb,
  ThemeStudioEngine,
} from '../src/client/theme-engine.ts'
import { CYBERPUNK_NEON, DEEPSEEK_CLASSIC, NORD_AURORA, SOLARIZED_LIGHT } from '../src/presets.ts'
import type { ThemeDefinition } from '../src/types.ts'

describe('Color & Contrast Mathematics', () => {
  it('parses hex colors correctly', () => {
    expect(parseColorToRgb('#ffffff')).toEqual([255, 255, 255])
    expect(parseColorToRgb('#000000')).toEqual([0, 0, 0])
    expect(parseColorToRgb('#fff')).toEqual([255, 255, 255])
    expect(parseColorToRgb('#1e1e2e')).toEqual([30, 30, 46])
  })

  it('parses rgb and rgba strings correctly', () => {
    expect(parseColorToRgb('rgb(15, 17, 21)')).toEqual([15, 17, 21])
    expect(parseColorToRgb('rgba(65, 118, 230, 0.5)')).toEqual([65, 118, 230])
  })

  it('computes relative luminance within valid range [0, 1]', () => {
    expect(calculateLuminance(0, 0, 0)).toBeCloseTo(0, 4)
    expect(calculateLuminance(255, 255, 255)).toBeCloseTo(1, 4)
    const midLum = calculateLuminance(128, 128, 128)
    expect(midLum).toBeGreaterThan(0)
    expect(midLum).toBeLessThan(1)
  })

  it('computes contrast ratios matching WCAG 2.1 specifications', () => {
    // Pure Black vs Pure White is 21:1
    const maxContrast = calculateContrastRatio('#000000', '#ffffff')
    expect(maxContrast).toBeCloseTo(21, 0)

    // DeepSeek Classic base vs text
    const dsContrast = calculateContrastRatio(
      DEEPSEEK_CLASSIC.tokens.background.bgBase,
      DEEPSEEK_CLASSIC.tokens.text.textPrimary,
    )
    expect(dsContrast).toBeGreaterThanOrEqual(10)
  })

  it('evaluates contrast grades properly', () => {
    expect(evaluateContrastGrade(21)).toBe('AAA')
    expect(evaluateContrastGrade(7.5)).toBe('AAA')
    expect(evaluateContrastGrade(5.0)).toBe('AA')
    expect(evaluateContrastGrade(3.5)).toBe('Pass')
    expect(evaluateContrastGrade(2.0)).toBe('Fail')
  })
})

describe('State ramps and surface pairing', () => {
  it('derives translucent fills that are not the solid primary', () => {
    const dark = deriveStateRamp('rgb(34, 197, 94)', false)
    expect(dark.primary).toBe('rgb(34, 197, 94)')
    expect(dark.secondary).toBe('rgba(34, 197, 94, 0.24)')
    expect(dark.tertiary).toBe('rgba(34, 197, 94, 0.18)')
    expect(dark.primary).not.toBe(dark.secondary)
    expect(dark.primary).not.toBe(dark.tertiary)

    const light = deriveStateRamp('#059669', true)
    expect(light.secondary).toBe('rgba(5, 150, 105, 0.16)')
    expect(light.tertiary).toBe('rgba(5, 150, 105, 0.12)')
  })

  it('replaces a collapsed surface with a tinted fill', () => {
    expect(distinctSurface('#22c55e', '#22c55e', false)).toBe('rgba(34, 197, 94, 0.24)')
    expect(distinctSurface('rgba(65, 118, 230, 0.15)', 'rgb(65, 118, 230)', false)).toBe(
      'rgba(65, 118, 230, 0.15)',
    )
  })

  it('emits distinct chip fg/bg tokens and maps bg-subtle for fabric Badge', () => {
    const dict = generateTokenDictionary(DEEPSEEK_CLASSIC.tokens, DEEPSEEK_CLASSIC.material, false)
    expect(dict['--dsw-alias-bg-subtle']).toBe(DEEPSEEK_CLASSIC.tokens.background.bgSubtle)
    expect(dict['--dsw-alias-bg-elevated']).toBe(DEEPSEEK_CLASSIC.tokens.background.bgElevated)
    expect(dict['--dsw-alias-label-secondary']).not.toBe(dict['--dsw-alias-bg-subtle'])
    expect(dict['--dsw-alias-state-success-primary']).not.toBe(dict['--dsw-alias-state-success-secondary'])
    expect(dict['--dsw-alias-state-success-primary']).not.toBe(dict['--dsw-alias-state-success-tertiary'])
    expect(dict['--dsw-alias-state-warn-primary']).not.toBe(dict['--dsw-alias-state-warn-secondary'])
    expect(dict['--dsw-alias-state-error-primary']).not.toBe(dict['--dsw-alias-state-error-secondary'])
    expect(dict['--dsw-alias-state-business-primary']).not.toBe(dict['--dsw-alias-state-business-tertiary'])
    expect(dict['--dsw-alias-state-info-primary']).not.toBe(dict['--dsw-alias-state-info-tertiary'])
  })
})

describe('CSS Variable Generation', () => {
  it('generates valid :root, body and DSH theme selectors with --dsw-alias-* and --dsw-* properties', () => {
    const css = generateCssVariables(DEEPSEEK_CLASSIC.tokens)
    expect(css).toContain(':root, body, body[data-ds-dark-theme]')
    expect(css).toContain('--dsw-alias-bg-base: rgb(15, 17, 21) !important;')
    expect(css).toContain('--dsw-alias-label-primary: rgb(255, 255, 255) !important;')
    expect(css).toContain('--dsw-alias-brand-primary: rgb(65, 118, 230) !important;')
    expect(css).toContain('--dsw-color-brand-primary: rgb(65, 118, 230) !important;')
    expect(css).toContain('--dsw-material-acrylic-bg:')
  })
})

describe('ThemeStudioEngine State Management & Fabric Bridge', () => {
  let engine: ThemeStudioEngine
  let mockThemeService: FabricThemeService
  let themeChangeListener: ((t: { dark: boolean }) => void) | undefined

  beforeEach(() => {
    themeChangeListener = undefined
    mockThemeService = {
      setTokens: vi.fn(() => () => {}),
      clearTokens: vi.fn(),
      getTokens: vi.fn(() => ({})),
      onThemeChange: vi.fn((listener) => {
        themeChangeListener = listener
        return () => {
          themeChangeListener = undefined
        }
      }),
      isDark: vi.fn(() => true),
    }
    engine = new ThemeStudioEngine()
  })

  it('defaults to DeepSeek Classic', () => {
    expect(engine.getActiveThemeId()).toBe(DEEPSEEK_CLASSIC.id)
    expect(engine.getActiveTheme().name).toBe(DEEPSEEK_CLASSIC.name)
  })

  it('switches active theme to another preset and pushes tokens to FabricThemeService', () => {
    engine.init(mockThemeService)
    const success = engine.setActiveTheme(NORD_AURORA.id)
    expect(success).toBe(true)
    expect(engine.getActiveThemeId()).toBe(NORD_AURORA.id)
    expect(engine.getActiveTheme().name).toBe(NORD_AURORA.name)
    expect(mockThemeService.setTokens).toHaveBeenCalledWith(
      'fabric-theme-studio',
      expect.objectContaining({
        '--dsw-alias-bg-base': NORD_AURORA.tokens.background.bgBase,
      }),
      expect.objectContaining({ priority: 100, scope: 'global' }),
    )
  })

  it('notifies subscribers on theme change', () => {
    let notified = 0
    const unsubscribe = engine.subscribe(() => {
      notified++
    })

    engine.setActiveTheme(CYBERPUNK_NEON.id)
    expect(notified).toBe(1)

    unsubscribe()
    engine.setActiveTheme(DEEPSEEK_CLASSIC.id)
    expect(notified).toBe(1)
  })

  it('saves and activates custom theme', () => {
    const custom: ThemeDefinition = {
      ...DEEPSEEK_CLASSIC,
      id: 'my-custom-theme',
      name: 'My Custom Theme',
      isBuiltin: false,
    }

    engine.saveCustomTheme(custom)
    expect(engine.getActiveThemeId()).toBe('my-custom-theme')
    expect(engine.getCustomThemes()).toHaveLength(1)
    expect(engine.getCustomThemes()[0]?.name).toBe('My Custom Theme')
  })

  it('deletes custom theme and falls back to default', () => {
    const custom: ThemeDefinition = {
      ...DEEPSEEK_CLASSIC,
      id: 'theme-to-delete',
      name: 'To Delete',
      isBuiltin: false,
    }

    engine.saveCustomTheme(custom)
    expect(engine.getActiveThemeId()).toBe('theme-to-delete')

    const deleted = engine.deleteCustomTheme('theme-to-delete')
    expect(deleted).toBe(true)
    expect(engine.getCustomThemes()).toHaveLength(0)
    expect(engine.getActiveThemeId()).toBe(DEEPSEEK_CLASSIC.id)
  })

  it('resets all custom themes to default', () => {
    const custom: ThemeDefinition = {
      ...DEEPSEEK_CLASSIC,
      id: 'custom-1',
      name: 'Custom 1',
    }
    engine.saveCustomTheme(custom)
    expect(engine.getCustomThemes()).toHaveLength(1)

    engine.resetAll()
    expect(engine.getCustomThemes()).toHaveLength(0)
    expect(engine.getActiveThemeId()).toBe(DEEPSEEK_CLASSIC.id)
  })

  it('handles auto follow system preference and reacts to onThemeChange', () => {
    engine.init(mockThemeService)
    expect(engine.isAutoFollowSystem()).toBe(false)

    engine.setAutoFollowSystem(true)
    expect(engine.isAutoFollowSystem()).toBe(true)
    expect(engine.getActiveThemeId()).toBe(NORD_AURORA.id)

    // Simulate OS switching to light theme
    if (themeChangeListener) {
      themeChangeListener({ dark: false })
      expect(engine.getActiveThemeId()).toBe(SOLARIZED_LIGHT.id)
    }

    // Simulate OS switching to dark theme
    if (themeChangeListener) {
      themeChangeListener({ dark: true })
      expect(engine.getActiveThemeId()).toBe(NORD_AURORA.id)
    }
  })

  it('converts hex/rgb colors to rgba with clamped alpha', () => {
    expect(colorToRgba('#112233', 0.5)).toBe('rgba(17, 34, 51, 0.5)')
    expect(colorToRgba('rgb(15, 17, 21)', 0.72)).toBe('rgba(15, 17, 21, 0.72)')
    expect(colorToRgba('#fff', 2)).toBe('rgba(255, 255, 255, 1)')
  })

  it('emits acrylic filter/bg from the theme color instead of a hardcoded overlay', () => {
    const on = generateTokenDictionary(NORD_AURORA.tokens, NORD_AURORA.material, false)
    expect(on['--dsw-material-acrylic-filter']).toBe('blur(16px)')
    expect(on['--dsw-material-acrylic-bg']).toMatch(/^rgba\(/)
    expect(on['--dsw-material-acrylic-bg']).not.toBe('rgba(20, 22, 28, 0.75)')
    expect(on['--dsw-ambient-intensity']).toBe('0.8')

    const off = generateTokenDictionary(CYBERPUNK_NEON.tokens, CYBERPUNK_NEON.material, false)
    expect(off['--dsw-material-acrylic-filter']).toBe('none')
    expect(off['--dsw-material-acrylic-bg']).toBe(CYBERPUNK_NEON.tokens.background.bgBase)
  })

  it('paints ambient effects on the workbench drawer, not a z-index:-1 body layer', () => {
    const css = generateCssVariables(CYBERPUNK_NEON.tokens, CYBERPUNK_NEON.material, false)
    expect(css).toContain('--dsw-material-noise-opacity')
    expect(css).toContain('--dsw-material-acrylic-blur')
    expect(css).toContain('--dsw-material-acrylic-filter')
    expect(css).toContain('[data-fabric-workbench="true"]')
    expect(css).toContain('data-fabric-ambient="cyber-grid"')
    expect(css).toContain('data-fabric-ambient-speed')
    expect(css).toContain('fts-scanline')
    expect(css).toContain('fts-aurora-drift')
    expect(css).not.toContain('#fabric-theme-backdrop {')
    expect(css).not.toContain('z-index: -1')
  })

  it('controls dynamic effects toggle', () => {
    expect(engine.isDynamicEffectsEnabled()).toBe(true)
    engine.setDynamicEffectsEnabled(false)
    expect(engine.isDynamicEffectsEnabled()).toBe(false)
    engine.setDynamicEffectsEnabled(true)
    expect(engine.isDynamicEffectsEnabled()).toBe(true)
  })

  it('cleans up tokens on dispose', () => {
    engine.init(mockThemeService)
    engine.dispose()
    expect(mockThemeService.clearTokens).toHaveBeenCalledWith('fabric-theme-studio')
  })
})
