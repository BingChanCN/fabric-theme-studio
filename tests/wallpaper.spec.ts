import { describe, expect, it } from 'vitest'
import { TOKYO_NIGHT } from '../src/presets.ts'
import { ThemeHostStore, getWallpaperStorageDir } from '../src/index.ts'
import type { ThemeDefinition } from '../src/types.ts'

describe('Theme Wallpaper & Dimming Engine', () => {
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
