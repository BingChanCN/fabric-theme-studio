import { describe, expect, it } from 'vitest'
import { DEEPSEEK_CLASSIC, TOKYO_NIGHT } from '../src/presets.ts'
import {
  generateCssVariables,
  generateTokenDictionary,
} from '../src/client/theme-engine.ts'
import { ThemeHostStore, getWallpaperStorageDir } from '../src/index.ts'
import type { ThemeDefinition, ThemeMaterial } from '../src/types.ts'

describe('Theme Wallpaper & Dimming Engine', () => {
  it('derives semi-transparent bgBase when wallpaper is enabled', () => {
    const materialWithWallpaper: ThemeMaterial = {
      wallpaper: {
        enabled: true,
        url: '/api/theme-studio/wallpaper/test.jpg',
        dim: 0.60,
        fit: 'cover',
      },
    }

    const dict = generateTokenDictionary(TOKYO_NIGHT.tokens, materialWithWallpaper, false)
    // TOKYO_NIGHT bgBase is #1a1b26 (26, 27, 38)
    expect(dict['--dsw-alias-bg-base']).toBe('rgba(26, 27, 38, 0.6)')
    // Other surfaces like bubbles and sidebar remain solid/elevated
    expect(dict['--dsw-specific-bubble']).toBe(TOKYO_NIGHT.tokens.background.bgElevated)
    expect(dict['--dsw-specific-sidebar-fill']).toBe(TOKYO_NIGHT.tokens.background.bgElevated)
  })

  it('keeps solid bgBase when wallpaper is disabled or missing url', () => {
    const materialDisabled: ThemeMaterial = {
      wallpaper: {
        enabled: false,
        url: '/api/theme-studio/wallpaper/test.jpg',
      },
    }

    const dict = generateTokenDictionary(TOKYO_NIGHT.tokens, materialDisabled, false)
    expect(dict['--dsw-alias-bg-base']).toBe(TOKYO_NIGHT.tokens.background.bgBase)
  })

  it('generates wallpaper CSS rules with fit, blur, and opacity settings', () => {
    const material: ThemeMaterial = {
      wallpaper: {
        enabled: true,
        url: '/api/theme-studio/wallpaper/bg-cyber.png',
        fit: 'contain',
        dim: 0.70,
        blur: 6,
        opacity: 0.85,
      },
    }

    const css = generateCssVariables(TOKYO_NIGHT.tokens, material, false)
    expect(css).toContain('#fabric-theme-wallpaper')
    expect(css).toContain('/api/theme-studio/wallpaper/bg-cyber.png')
    expect(css).toContain('background-size: contain')
    expect(css).toContain('blur(6px)')
    expect(css).toContain('opacity: 0.85')
    expect(css).toContain('data-fabric-has-wallpaper="true"')
  })

  it('hides wallpaper container when wallpaper is not active', () => {
    const css = generateCssVariables(DEEPSEEK_CLASSIC.tokens, undefined, false)
    expect(css).toContain('#fabric-theme-wallpaper')
    expect(css).toContain('display: none !important')
  })

  it('provides wallpaper storage directory', () => {
    const dir = getWallpaperStorageDir()
    expect(dir).toBeDefined()
    expect(dir).toContain('fabric-theme-studio')
    expect(dir).toContain('wallpapers')
  })

  it('host store manages state and preserves custom theme wallpapers', () => {
    const store = new ThemeHostStore()
    const customWithWallpaper: ThemeDefinition = {
      ...TOKYO_NIGHT,
      id: 'custom-wp-1',
      name: 'Custom Tokyo Wallpaper',
      material: {
        wallpaper: {
          enabled: true,
          url: '/api/theme-studio/wallpaper/wp-123.jpg',
          dim: 0.5,
        },
      },
    }

    store.saveCustomTheme(customWithWallpaper)
    store.setActiveThemeId('custom-wp-1')

    const active = store.getActiveTheme()
    expect(active.id).toBe('custom-wp-1')
    expect(active.material?.wallpaper?.enabled).toBe(true)
    expect(active.material?.wallpaper?.url).toBe('/api/theme-studio/wallpaper/wp-123.jpg')
  })
})
