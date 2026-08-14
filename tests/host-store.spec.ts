import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeHostStore } from '../src/index.ts'
import { CYBERPUNK_NEON, DEEPSEEK_CLASSIC } from '../src/presets.ts'
import type { ThemeDefinition } from '../src/types.ts'

describe('ThemeHostStore', () => {
  let store: ThemeHostStore

  beforeEach(() => {
    store = new ThemeHostStore()
  })

  it('initializes with DeepSeek Classic as default', () => {
    expect(store.getActiveThemeId()).toBe(DEEPSEEK_CLASSIC.id)
    expect(store.getActiveTheme().id).toBe(DEEPSEEK_CLASSIC.id)
  })

  it('updates active theme for existing preset', () => {
    const ok = store.setActiveThemeId(CYBERPUNK_NEON.id)
    expect(ok).toBe(true)
    expect(store.getActiveThemeId()).toBe(CYBERPUNK_NEON.id)
    expect(store.getActiveTheme().name).toBe(CYBERPUNK_NEON.name)
  })

  it('rejects invalid theme id', () => {
    const ok = store.setActiveThemeId('non-existent-theme-id')
    expect(ok).toBe(false)
    expect(store.getActiveThemeId()).toBe(DEEPSEEK_CLASSIC.id)
  })

  it('saves and retrieves custom themes', () => {
    const custom: ThemeDefinition = {
      ...DEEPSEEK_CLASSIC,
      id: 'custom-retro',
      name: 'Custom Retro',
    }
    store.saveCustomTheme(custom)

    expect(store.getCustomThemes()).toHaveLength(1)
    expect(store.getCustomThemes()[0]?.id).toBe('custom-retro')

    const ok = store.setActiveThemeId('custom-retro')
    expect(ok).toBe(true)
    expect(store.getActiveTheme().name).toBe('Custom Retro')
  })

  it('deletes custom theme and falls back to default if deleted theme was active', () => {
    const custom: ThemeDefinition = {
      ...DEEPSEEK_CLASSIC,
      id: 'temp-theme',
      name: 'Temp Theme',
    }
    store.saveCustomTheme(custom)
    store.setActiveThemeId('temp-theme')

    const deleted = store.deleteCustomTheme('temp-theme')
    expect(deleted).toBe(true)
    expect(store.getCustomThemes()).toHaveLength(0)
    expect(store.getActiveThemeId()).toBe(DEEPSEEK_CLASSIC.id)
  })

  it('produces full state payload for client bootstrap', () => {
    const payload = store.getStatePayload()
    expect(payload.version).toBe('0.6.3')
    expect(payload.activeThemeId).toBe(DEEPSEEK_CLASSIC.id)
    expect(payload.presets.length).toBeGreaterThanOrEqual(8)
    expect(payload.customThemes).toEqual([])
  })
})
