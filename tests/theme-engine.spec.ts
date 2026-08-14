import { beforeEach, describe, expect, it } from 'vitest'
import {
  calculateContrastRatio,
  calculateLuminance,
  evaluateContrastGrade,
  generateCssVariables,
  parseColorToRgb,
  ThemeStudioEngine,
} from '../src/client/theme-engine.ts'
import { CYBERPUNK_NEON, DEEPSEEK_CLASSIC, NORD_AURORA } from '../src/presets.ts'
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

describe('CSS Variable Generation', () => {
  it('generates valid :root, body and DSH theme selectors with --dsw-alias-* and --dsw-* properties', () => {
    const css = generateCssVariables(DEEPSEEK_CLASSIC.tokens)
    expect(css).toContain(':root, body, body[data-ds-dark-theme]')
    expect(css).toContain('--dsw-alias-bg-base: rgb(15, 17, 21) !important;')
    expect(css).toContain('--dsw-alias-label-primary: rgb(255, 255, 255) !important;')
    expect(css).toContain('--dsw-alias-brand-primary: rgb(65, 118, 230) !important;')
    expect(css).toContain('--dsw-color-brand-primary: rgb(65, 118, 230) !important;')
    expect(css).toContain('--fts-brand-primary: rgb(65, 118, 230) !important;')
  })
})

describe('ThemeStudioEngine State Management', () => {
  let engine: ThemeStudioEngine

  beforeEach(() => {
    engine = new ThemeStudioEngine()
  })

  it('defaults to DeepSeek Classic', () => {
    expect(engine.getActiveThemeId()).toBe(DEEPSEEK_CLASSIC.id)
    expect(engine.getActiveTheme().name).toBe(DEEPSEEK_CLASSIC.name)
  })

  it('switches active theme to another preset', () => {
    const success = engine.setActiveTheme(NORD_AURORA.id)
    expect(success).toBe(true)
    expect(engine.getActiveThemeId()).toBe(NORD_AURORA.id)
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
})
