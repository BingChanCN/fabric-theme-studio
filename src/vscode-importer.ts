/**
 * VSCode Theme Importer and Converter
 *
 * Parses VSCode theme.json files and converts them into DSH --dsw-* design tokens.
 */

import { adjustLightness, getRelativeLuminance, normalizeHex } from './color-science'
import type { CustomTheme } from './types'

export interface VSCodeThemeColors {
  'editor.background'?: string
  'editor.foreground'?: string
  'activityBar.background'?: string
  'activityBar.foreground'?: string
  'activityBarBadge.background'?: string
  'sideBar.background'?: string
  'sideBar.foreground'?: string
  'sideBar.border'?: string
  'tab.activeBackground'?: string
  'tab.inactiveBackground'?: string
  'tab.border'?: string
  'editorGroupHeader.tabsBackground'?: string
  'editorGroup.border'?: string
  'panel.border'?: string
  'focusBorder'?: string
  'button.background'?: string
  'button.hoverBackground'?: string
  'button.foreground'?: string
  'badge.background'?: string
  'input.background'?: string
  'input.foreground'?: string
  'input.border'?: string
  'dropdown.background'?: string
  'list.hoverBackground'?: string
  'list.activeSelectionBackground'?: string
  'descriptionForeground'?: string
  'terminal.ansiGreen'?: string
  'terminal.ansiYellow'?: string
  'terminal.ansiRed'?: string
  'terminal.ansiBlue'?: string
  'editorError.foreground'?: string
  'editorWarning.foreground'?: string
  'editorInfo.foreground'?: string
  [key: string]: string | undefined
}

export interface VSCodeThemeRaw {
  name?: string
  type?: 'dark' | 'light' | string
  colors?: VSCodeThemeColors
  [key: string]: unknown
}

export interface ImportResult {
  success: boolean
  theme?: CustomTheme
  error?: string
  detectedType?: 'dark' | 'light'
}

/**
 * Parses raw JSON string into a VSCodeThemeRaw structure.
 * Strips comments (JSONC support) and handles common malformed JSON quirks.
 */
export function parseVSCodeThemeJson(jsonString: string): VSCodeThemeRaw {
  // Strip single-line comments // and multi-line comments /* ... */
  const cleaned = jsonString
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^\\:])\/\/.*$/gm, '$1')
    .trim()

  return JSON.parse(cleaned) as VSCodeThemeRaw
}

/**
 * Converts a parsed VSCode theme object into a DSH CustomTheme definition.
 */
export function convertVSCodeTheme(raw: VSCodeThemeRaw, customName?: string): ImportResult {
  try {
    const hasColorsProp = typeof raw.colors === 'object' && raw.colors !== null && Object.keys(raw.colors).length > 0
    const colors: VSCodeThemeColors = hasColorsProp
      ? raw.colors!
      : (typeof raw === 'object' && raw !== null ? (raw as unknown as VSCodeThemeColors) : {})

    // Check if there is at least one color key present
    const hasAnyColorKey = Object.keys(colors).some(
      k => k.includes('.') || k.startsWith('#') || k.toLowerCase().includes('color') || k.toLowerCase().includes('background'),
    )

    if (!hasColorsProp && !hasAnyColorKey) {
      return { success: false, error: '未在主题数据中检测到有效的 VSCode 颜色键值 (如 editor.background)' }
    }

    // Determine dark vs light mode
    const bgCandidate =
      colors['editor.background'] ||
      colors['sideBar.background'] ||
      colors['activityBar.background'] ||
      '#1e1e1e'

    const lum = getRelativeLuminance(bgCandidate)
    const isDark = raw.type === 'light' ? false : raw.type === 'dark' ? true : lum < 0.5

    const name = customName?.trim() || raw.name || (isDark ? 'VSCode Dark Imported' : 'VSCode Light Imported')

    // Background hierarchy
    const bgBase = normalizeHex(colors['sideBar.background'] || colors['activityBar.background'] || bgCandidate)
    const bgLayer1 = normalizeHex(colors['editor.background'] || bgCandidate)
    const bgLayer2 = normalizeHex(colors['tab.inactiveBackground'] || colors['editorGroupHeader.tabsBackground'] || adjustLightness(bgLayer1, isDark ? 4 : -4))
    const bgLayer3 = normalizeHex(colors['input.background'] || colors['dropdown.background'] || adjustLightness(bgLayer1, isDark ? 8 : -8))
    const bgSubtle = normalizeHex(colors['list.hoverBackground'] || adjustLightness(bgLayer1, isDark ? 6 : -6))

    // Text hierarchy
    const fgCandidate = colors['editor.foreground'] || (isDark ? '#ffffff' : '#111827')
    const labelPrimary = normalizeHex(fgCandidate)
    const labelSecondary = normalizeHex(colors['descriptionForeground'] || colors['sideBar.foreground'] || adjustLightness(labelPrimary, isDark ? -20 : 25))
    const labelTertiary = adjustLightness(labelSecondary, isDark ? -15 : 20)
    const labelMuted = adjustLightness(labelTertiary, isDark ? -15 : 20)

    // Border hierarchy
    const borderL1 = colors['sideBar.border'] || colors['editorGroup.border'] || (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)')
    const borderL2 = colors['tab.border'] || colors['panel.border'] || (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)')
    const borderL3 = colors['focusBorder'] || (isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)')

    // Brand color
    const brandPrimary = normalizeHex(
      colors['activityBarBadge.background'] ||
      colors['button.background'] ||
      colors['focusBorder'] ||
      colors['badge.background'] ||
      (isDark ? '#4176e6' : '#2563eb'),
    )
    const brandHover = normalizeHex(colors['button.hoverBackground'] || adjustLightness(brandPrimary, isDark ? 8 : -8))
    const brandActive = adjustLightness(brandPrimary, isDark ? -8 : 8)
    const brandSubtle = adjustLightness(brandPrimary, isDark ? -40 : 40)

    // State colors
    const stateSuccess = normalizeHex(colors['terminal.ansiGreen'] || (isDark ? '#34d399' : '#059669'))
    const stateWarning = normalizeHex(colors['terminal.ansiYellow'] || colors['editorWarning.foreground'] || (isDark ? '#fbbf24' : '#d97706'))
    const stateDanger = normalizeHex(colors['terminal.ansiRed'] || colors['editorError.foreground'] || (isDark ? '#f87171' : '#dc2626'))
    const stateInfo = normalizeHex(colors['terminal.ansiBlue'] || colors['editorInfo.foreground'] || brandPrimary)

    const tokens: Record<string, string> = {
      '--dsw-alias-bg-base': bgBase,
      '--dsw-alias-bg-layer-1': bgLayer1,
      '--dsw-alias-bg-layer-2': bgLayer2,
      '--dsw-alias-bg-layer-3': bgLayer3,
      '--dsw-alias-bg-subtle': bgSubtle,

      '--dsw-alias-label-primary': labelPrimary,
      '--dsw-alias-label-secondary': labelSecondary,
      '--dsw-alias-label-tertiary': labelTertiary,
      '--dsw-alias-label-muted': labelMuted,

      '--dsw-alias-border-l1': borderL1,
      '--dsw-alias-border-l2': borderL2,
      '--dsw-alias-border-l3': borderL3,

      '--dsw-alias-brand-primary': brandPrimary,
      '--dsw-alias-brand-hover': brandHover,
      '--dsw-alias-brand-active': brandActive,
      '--dsw-alias-brand-subtle': brandSubtle,

      '--dsw-alias-state-success': stateSuccess,
      '--dsw-alias-state-warning': stateWarning,
      '--dsw-alias-state-danger': stateDanger,
      '--dsw-alias-state-info': stateInfo,

      '--dsw-alias-interactive-bg-hover': isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
      '--dsw-alias-interactive-bg-active': isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',

      '--dsw-specific-card-bg': bgLayer1,
      '--dsw-specific-sidebar-bg': bgBase,
      '--dsw-specific-input-bg': bgLayer2,
      '--dsw-static-black': '#000000',
      '--dsw-static-white': '#ffffff',

      '--dsw-color-bg-primary': bgBase,
      '--dsw-color-bg-secondary': bgLayer1,
      '--dsw-color-text-primary': labelPrimary,
      '--dsw-color-text-secondary': labelSecondary,
      '--dsw-color-border-primary': borderL2,
      '--dsw-color-accent-primary': brandPrimary,
    }

    const theme: CustomTheme = {
      id: `vscode-imported-${Date.now()}`,
      name,
      author: 'VSCode Importer',
      description: `从 VSCode ${raw.name ?? '主题'} 自动映射转换生成的 ${isDark ? '深色' : '浅色'} DSH 设计系统主题`,
      tags: ['custom', 'vscode', isDark ? 'dark' : 'light'],
      isDark,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tokens,
    }

    return {
      success: true,
      theme,
      detectedType: isDark ? 'dark' : 'light',
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '转换 VSCode 主题时发生未知错误',
    }
  }
}
