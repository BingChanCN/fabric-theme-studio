import { describe, expect, it } from 'vitest'
import {
  BUILTIN_PRESETS,
  CATPPUCCIN_MOCHA,
  CYBERPUNK_NEON,
  DEEPSEEK_CLASSIC,
  GRUVBOX_RETRO,
  MONOCHROME_PRO,
  NORD_AURORA,
  SOLARIZED_LIGHT,
  TOKYO_NIGHT,
} from '../src/presets.ts'
import type { ThemeDefinition } from '../src/types.ts'

function assertValidThemeTokens(theme: ThemeDefinition): void {
  const { tokens } = theme
  expect(tokens).toBeDefined()
  expect(tokens.background).toBeDefined()
  expect(tokens.background.bgBase).toBeTruthy()
  expect(tokens.background.bgElevated).toBeTruthy()
  expect(tokens.background.bgSurface).toBeTruthy()

  expect(tokens.text).toBeDefined()
  expect(tokens.text.textPrimary).toBeTruthy()
  expect(tokens.text.textSecondary).toBeTruthy()

  expect(tokens.border).toBeDefined()
  expect(tokens.border.borderBase).toBeTruthy()

  expect(tokens.brand).toBeDefined()
  expect(tokens.brand.brandPrimary).toBeTruthy()

  expect(tokens.status).toBeDefined()
  expect(tokens.status.success).toBeTruthy()
  expect(tokens.status.warning).toBeTruthy()
  expect(tokens.status.error).toBeTruthy()
  expect(tokens.status.info).toBeTruthy()

  expect(tokens.shape).toBeDefined()
  expect(tokens.shape.radiusSm).toBeTruthy()
  expect(tokens.shape.radiusMd).toBeTruthy()
}

describe('Preset Themes Inventory', () => {
  it('contains all 8 curated presets', () => {
    expect(BUILTIN_PRESETS).toHaveLength(8)
  })

  it('has unique IDs for all presets', () => {
    const ids = BUILTIN_PRESETS.map(p => p.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('verifies DeepSeek Classic definition', () => {
    expect(DEEPSEEK_CLASSIC.id).toBe('deepseek-classic')
    expect(DEEPSEEK_CLASSIC.category).toBe('dark')
    assertValidThemeTokens(DEEPSEEK_CLASSIC)
  })

  it('verifies Nord Aurora definition', () => {
    expect(NORD_AURORA.id).toBe('nord-aurora')
    expect(NORD_AURORA.category).toBe('dark')
    assertValidThemeTokens(NORD_AURORA)
  })

  it('verifies Cyberpunk Neon definition', () => {
    expect(CYBERPUNK_NEON.id).toBe('cyberpunk-neon')
    expect(CYBERPUNK_NEON.category).toBe('special')
    assertValidThemeTokens(CYBERPUNK_NEON)
  })

  it('verifies Catppuccin Mocha definition', () => {
    expect(CATPPUCCIN_MOCHA.id).toBe('catppuccin-mocha')
    assertValidThemeTokens(CATPPUCCIN_MOCHA)
  })

  it('verifies Gruvbox Retro definition', () => {
    expect(GRUVBOX_RETRO.id).toBe('gruvbox-retro')
    assertValidThemeTokens(GRUVBOX_RETRO)
  })

  it('verifies Tokyo Night definition', () => {
    expect(TOKYO_NIGHT.id).toBe('tokyo-night')
    assertValidThemeTokens(TOKYO_NIGHT)
  })

  it('verifies Solarized Light definition', () => {
    expect(SOLARIZED_LIGHT.id).toBe('solarized-light')
    expect(SOLARIZED_LIGHT.category).toBe('light')
    assertValidThemeTokens(SOLARIZED_LIGHT)
  })

  it('verifies Monochrome Pro definition', () => {
    expect(MONOCHROME_PRO.id).toBe('monochrome-pro')
    assertValidThemeTokens(MONOCHROME_PRO)
  })
})
