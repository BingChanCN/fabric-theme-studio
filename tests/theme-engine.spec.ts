import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FabricThemeProvider } from '@dsh-do/fabric/client'
import {
  calculateContrastRatio,
  calculateLuminance,
  colorToRgba,
  deriveStateRamp,
  distinctSurface,
  evaluateContrastGrade,
  parseColorToRgb,
  toFabricTheme,
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

  it('dims surface.base when a wallpaper is active so AppFrame can show it', () => {
    const themed = toFabricTheme({
      ...DEEPSEEK_CLASSIC,
      material: {
        wallpaper: { enabled: true, url: 'data:image/png;base64,xx', dim: 0.4 },
      },
    })
    expect(themed.surface.base).toBe(colorToRgba(DEEPSEEK_CLASSIC.tokens.background.bgBase, 0.4))
    expect(themed.surface.raised).toBe(DEEPSEEK_CLASSIC.tokens.background.bgElevated)
  })

  it('maps theme editor values to distinct Fabric semantic roles', () => {
    const theme = toFabricTheme(DEEPSEEK_CLASSIC)
    expect(theme.surface.base).toBe(DEEPSEEK_CLASSIC.tokens.background.bgBase)
    expect(theme.content.primary).toBe(DEEPSEEK_CLASSIC.tokens.text.textPrimary)
    expect(theme.state.success.foreground).not.toBe(theme.state.success.surface)
    expect(theme.state.success.foreground).not.toBe(theme.state.success.border)
    expect(theme.state.warning.foreground).not.toBe(theme.state.warning.surface)
  })
})

describe('ThemeStudioEngine State Management & Fabric Bridge', () => {
  let engine: ThemeStudioEngine
  let mockThemeService: FabricThemeProvider
  let themeTokenCleanup: ReturnType<typeof vi.fn>
  let themeChangeListener: ((t: { dark: boolean }) => void) | undefined

  beforeEach(() => {
    themeChangeListener = undefined
    themeTokenCleanup = vi.fn()
    mockThemeService = {
      provide: vi.fn(() => themeTokenCleanup) as FabricThemeProvider['provide'],
      clear: vi.fn(),
      onChange: vi.fn((listener) => {
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
    expect(mockThemeService.provide).toHaveBeenCalledWith(
      'theme',
      expect.objectContaining({
        surface: expect.objectContaining({ base: NORD_AURORA.tokens.background.bgBase }),
        content: expect.objectContaining({ primary: NORD_AURORA.tokens.text.textPrimary }),
      }),
      expect.objectContaining({ priority: 100, scope: 'global' }),
    )
  })

  it('keeps the selected theme id when applying a wallpaper draft', () => {
    engine.setActiveTheme(NORD_AURORA.id)
    const drafted: ThemeDefinition = {
      ...NORD_AURORA,
      material: {
        wallpaper: { enabled: true, url: 'data:image/png;base64,xx', dim: 0.5 },
      },
    }
    engine.applyCustomThemeDraft(drafted)
    expect(engine.getActiveThemeId()).toBe(NORD_AURORA.id)
    expect(engine.getActiveTheme().material?.wallpaper?.url).toBe('data:image/png;base64,xx')
    expect(engine.getActiveTheme().name).toBe(NORD_AURORA.name)
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

  it('emits material semantics from the theme definition', () => {
    engine.init(mockThemeService)
    expect(mockThemeService.provide).toHaveBeenCalledWith(
      'theme',
      expect.objectContaining({
        material: expect.objectContaining({ acrylicFilter: 'blur(16px)' }),
      }),
      expect.objectContaining({ priority: 100, scope: 'global' }),
    )
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
    expect(themeTokenCleanup).toHaveBeenCalled()
  })
})
