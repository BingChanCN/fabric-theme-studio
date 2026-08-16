import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeHostStore } from '../src/host.ts'
import { CYBERPUNK_NEON, DEEPSEEK_CLASSIC } from '../src/presets.ts'
import type { ThemeDefinition } from '../src/types.ts'
import { createThemeDocument } from './theme-document-fixture.ts'

describe('ThemeHostStore', () => {
  let store: ThemeHostStore

  beforeEach(() => {
    store = new ThemeHostStore(createThemeDocument())
  })

  it('initializes with DeepSeek Classic as default', async () => {
    const state = await store.getStatePayload()
    expect(state.activeThemeId).toBe(DEEPSEEK_CLASSIC.id)
    expect(state.activeTheme.id).toBe(DEEPSEEK_CLASSIC.id)
  })

  it('persists an existing preset as the active theme', async () => {
    const active = await store.setActiveThemeId(CYBERPUNK_NEON.id)
    expect(active.activeThemeId).toBe(CYBERPUNK_NEON.id)
    expect(active.activeTheme.name).toBe(CYBERPUNK_NEON.name)
    expect((await store.getStatePayload()).activeThemeId).toBe(CYBERPUNK_NEON.id)
  })

  it('rejects an invalid theme id without changing the document', async () => {
    await expect(store.setActiveThemeId('non-existent-theme-id')).rejects.toThrow('theme-not-found')
    expect((await store.getStatePayload()).activeThemeId).toBe(DEEPSEEK_CLASSIC.id)
  })

  it('saves, activates and deletes a custom theme atomically', async () => {
    const custom: ThemeDefinition = { ...DEEPSEEK_CLASSIC, id: 'custom-retro', name: 'Custom Retro' }
    await store.saveCustomTheme(custom)
    await store.setActiveThemeId(custom.id)
    expect((await store.getStatePayload()).activeTheme.name).toBe('Custom Retro')

    const result = await store.deleteCustomTheme(custom.id)
    expect(result.deleted).toBe(true)
    expect(result.state.customThemes).toEqual([])
    expect(result.state.activeThemeId).toBe(DEEPSEEK_CLASSIC.id)
  })

  it('keeps state across Host store instances backed by the same document', async () => {
    const document = createThemeDocument()
    const first = new ThemeHostStore(document)
    await first.setActiveThemeId(CYBERPUNK_NEON.id)
    const restarted = new ThemeHostStore(document)

    const payload = await restarted.getStatePayload()
    expect(payload.version).toBe('1.0.0')
    expect(payload.activeThemeId).toBe(CYBERPUNK_NEON.id)
    expect(payload.presets.length).toBeGreaterThanOrEqual(8)
  })
})
