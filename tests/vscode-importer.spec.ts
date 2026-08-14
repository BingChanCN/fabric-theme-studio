import { describe, expect, it } from 'vitest'
import { convertVSCodeTheme, parseVSCodeThemeJson } from '../src/vscode-importer'

describe('vscode-importer module', () => {
  it('parses JSON with comments (JSONC)', () => {
    const jsonc = `
    {
      // Theme Metadata
      "name": "One Dark Pro",
      /* Theme type */
      "type": "dark",
      "colors": {
        "editor.background": "#282c34",
        "editor.foreground": "#abb2bf" // text
      }
    }
    `
    const parsed = parseVSCodeThemeJson(jsonc)
    expect(parsed.name).toBe('One Dark Pro')
    expect(parsed.type).toBe('dark')
    expect(parsed.colors?.['editor.background']).toBe('#282c34')
  })

  it('converts a dark VSCode theme into DSH CustomTheme tokens correctly', () => {
    const rawTheme = {
      name: 'Ayu Dark',
      type: 'dark',
      colors: {
        'editor.background': '#0b0e14',
        'editor.foreground': '#bfbdb6',
        'activityBar.background': '#0b0e14',
        'sideBar.background': '#0b0e14',
        'focusBorder': '#e6b450',
        'button.background': '#e6b450',
        'activityBarBadge.background': '#e6b450',
        'terminal.ansiGreen': '#aad94c',
        'terminal.ansiYellow': '#e6b450',
        'terminal.ansiRed': '#d95757',
        'terminal.ansiBlue': '#59c2ff',
      },
    }

    const result = convertVSCodeTheme(rawTheme)
    expect(result.success).toBe(true)
    expect(result.detectedType).toBe('dark')
    expect(result.theme).toBeDefined()
    expect(result.theme?.name).toBe('Ayu Dark')
    expect(result.theme?.isDark).toBe(true)
    expect(result.theme?.tokens['--dsw-alias-bg-base']).toBe('#0b0e14')
    expect(result.theme?.tokens['--dsw-alias-brand-primary']).toBe('#e6b450')
    expect(result.theme?.tokens['--dsw-alias-state-success']).toBe('#aad94c')
  })

  it('converts a light VSCode theme into DSH CustomTheme tokens correctly', () => {
    const rawTheme = {
      name: 'GitHub Light Default',
      type: 'light',
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#24292f',
        'sideBar.background': '#f6f8fa',
        'button.background': '#2da44e',
      },
    }

    const result = convertVSCodeTheme(rawTheme)
    expect(result.success).toBe(true)
    expect(result.detectedType).toBe('light')
    expect(result.theme?.isDark).toBe(false)
    expect(result.theme?.tokens['--dsw-alias-bg-base']).toBe('#f6f8fa')
  })

  it('handles invalid colors structure gracefully', () => {
    const result = convertVSCodeTheme({ name: 'Empty' } as any)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
