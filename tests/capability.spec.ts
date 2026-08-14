import { beforeEach, describe, expect, it } from 'vitest'
import { DEEPSEEK_CLASSIC, NORD_AURORA } from '../src/presets.ts'
import { themeEngine } from '../src/client/theme-engine.ts'
import type { ThemeStudioCapabilityApi } from '../src/client/index.ts'

describe('Theme Studio Capability IMC API', () => {
  let api: ThemeStudioCapabilityApi

  beforeEach(() => {
    themeEngine.resetAll()
    api = {
      getActiveTheme: () => themeEngine.getActiveTheme(),
      setActiveTheme: (id: string) => themeEngine.setActiveTheme(id),
      getPresets: () => themeEngine.getPresets(),
      getCustomThemes: () => themeEngine.getCustomThemes(),
      getAllThemes: () => themeEngine.getAllThemes(),
      cycleNextTheme: () => {
        const all = themeEngine.getAllThemes()
        const current = themeEngine.getActiveTheme()
        const nextIndex = (all.findIndex((t: { id: string }) => t.id === current.id) + 1) % all.length
        const next = all[nextIndex] ?? all[0]!
        themeEngine.setActiveTheme(next.id)
        return next
      },
      saveCustomTheme: theme => themeEngine.saveCustomTheme(theme),
      deleteCustomTheme: themeId => themeEngine.deleteCustomTheme(themeId),
      resetAll: () => themeEngine.resetAll(),
    }
  })

  it('exposes active theme and preset list', () => {
    expect(api.getActiveTheme().id).toBe(DEEPSEEK_CLASSIC.id)
    expect(api.getPresets().length).toBeGreaterThanOrEqual(8)
  })

  it('supports setActiveTheme and updates active theme', () => {
    api.setActiveTheme(NORD_AURORA.id)
    expect(api.getActiveTheme().id).toBe(NORD_AURORA.id)
    expect(api.getActiveTheme().name).toBe('Nord Aurora')
  })

  it('cycles through all available themes seamlessly', () => {
    const initial = api.getActiveTheme()
    const next = api.cycleNextTheme()
    expect(next.id).not.toBe(initial.id)
    expect(api.getActiveTheme().id).toBe(next.id)
  })

  it('manages custom theme lifecycle via IMC API', () => {
    const custom = {
      ...DEEPSEEK_CLASSIC,
      id: 'custom-imc-1',
      name: 'Custom IMC Theme',
      isBuiltin: false,
    }
    api.saveCustomTheme(custom)
    expect(api.getCustomThemes().length).toBe(1)
    expect(api.getActiveTheme().id).toBe('custom-imc-1')

    const deleted = api.deleteCustomTheme('custom-imc-1')
    expect(deleted).toBe(true)
    expect(api.getCustomThemes().length).toBe(0)
    expect(api.getActiveTheme().id).toBe(DEEPSEEK_CLASSIC.id)
  })
})
