import { useEffect, useState } from 'react'
import type { FabricThemeService } from 'fabric/client'
import { BUILTIN_PRESETS, DEEPSEEK_CLASSIC, NORD_AURORA, SOLARIZED_LIGHT } from '../presets.ts'
import type { ContrastGrade, ThemeDefinition, ThemeStudioStatePayload, ThemeTokens } from '../types.ts'

const STORAGE_KEY_ACTIVE = 'fabric_theme_studio_active_id'
const STORAGE_KEY_CUSTOM = 'fabric_theme_studio_custom_themes'
const STORAGE_KEY_AUTO = 'fabric_theme_studio_auto_system'
const STYLE_TAG_ID = 'fabric-theme-studio-injected-style'

/** Parse color string (rgb, rgba, hex) to RGB channels [0..255]. */
export function parseColorToRgb(color: string): [number, number, number] | null {
  const trimmed = color.trim().toLowerCase()
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1)
    if (hex.length === 3) {
      const r = Number.parseInt(hex[0]! + hex[0]!, 16)
      const g = Number.parseInt(hex[1]! + hex[1]!, 16)
      const b = Number.parseInt(hex[2]! + hex[2]!, 16)
      return [r, g, b]
    }
    if (hex.length === 6) {
      const r = Number.parseInt(hex.slice(0, 2), 16)
      const g = Number.parseInt(hex.slice(2, 4), 16)
      const b = Number.parseInt(hex.slice(4, 6), 16)
      return [r, g, b]
    }
  }
  const rgbMatch = trimmed.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgbMatch) {
    const r = Number.parseInt(rgbMatch[1]!, 10)
    const g = Number.parseInt(rgbMatch[2]!, 10)
    const b = Number.parseInt(rgbMatch[3]!, 10)
    return [r, g, b]
  }
  return null
}

/** Calculate relative luminance of an sRGB color per WCAG 2.1 specs. */
export function calculateLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  const lumR = a[0] ?? 0
  const lumG = a[1] ?? 0
  const lumB = a[2] ?? 0
  return 0.2126 * lumR + 0.7152 * lumG + 0.0722 * lumB
}

/** Calculate contrast ratio between two colors (e.g. background and text). */
export function calculateContrastRatio(colorA: string, colorB: string): number {
  const rgbA = parseColorToRgb(colorA)
  const rgbB = parseColorToRgb(colorB)
  if (!rgbA || !rgbB) return 4.5
  const lumA = calculateLuminance(rgbA[0], rgbA[1], rgbA[2])
  const lumB = calculateLuminance(rgbB[0], rgbB[1], rgbB[2])
  const brightest = Math.max(lumA, lumB)
  const darkest = Math.min(lumA, lumB)
  const ratio = (brightest + 0.05) / (darkest + 0.05)
  return Math.round(ratio * 100) / 100
}

/** Evaluate WCAG grade from contrast ratio. */
export function evaluateContrastGrade(ratio: number): ContrastGrade {
  if (ratio >= 7.0) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3.0) return 'Pass'
  return 'Fail'
}

/** Generate a complete dictionary of tokens for FabricThemeService and CSS variables. */
export function generateTokenDictionary(tokens: ThemeTokens): Record<string, string> {
  return {
    // DSH Core Background & Container Aliases
    '--dsw-alias-bg-base': tokens.background.bgBase,
    '--dsw-alias-bg-layer-1': tokens.background.bgElevated,
    '--dsw-alias-bg-layer-2': tokens.background.bgSubtle,
    '--dsw-alias-bg-layer-3': tokens.background.bgSurface,
    '--dsw-alias-bg-overlay': tokens.background.bgElevated,
    '--dsw-alias-bg-module-platform': tokens.background.bgElevated,
    '--dsw-alias-bg-multi-select': tokens.background.bgSurface,
    '--dsw-alias-bg-skeleton': tokens.background.bgSubtle,

    // DSH Specific UI Components
    '--dsw-specific-sidebar-fill': tokens.background.bgElevated,
    '--dsw-specific-sidebar-nav-item-active': tokens.brand.brandSurface,
    '--dsw-specific-sidebar-nav-item-active-accent': tokens.brand.brandPrimary,
    '--dsw-specific-sidebar-nav-item-hover': tokens.background.bgSurface,
    '--dsw-specific-input-major': tokens.background.bgSunken,
    '--dsw-specific-login-input': tokens.background.bgSunken,
    '--dsw-specific-bubble': tokens.background.bgElevated,
    '--dsw-specific-bubble-highlight': tokens.brand.brandSurface,
    '--dsw-specific-selector': tokens.background.bgSurface,
    '--dsw-specific-tip': tokens.background.bgSurface,
    '--dsw-specific-menu': tokens.background.bgElevated,

    // Typography / Text Hierarchy
    '--dsw-alias-label-primary': tokens.text.textPrimary,
    '--dsw-alias-label-primary-bluish': tokens.text.textPrimary,
    '--dsw-alias-label-primary-dimmed': tokens.text.textSecondary,
    '--dsw-alias-label-primary-foreground': tokens.text.textPrimary,
    '--dsw-alias-label-primary-inverted': tokens.background.bgBase,
    '--dsw-alias-label-secondary': tokens.text.textSecondary,
    '--dsw-alias-label-tertiary': tokens.text.textTertiary,
    '--dsw-alias-label-caption': tokens.text.textDisabled,
    '--dsw-alias-label-dimmed': tokens.text.textDisabled,

    // Dividers & Borders
    '--dsw-alias-border-l1': tokens.border.borderSubtle,
    '--dsw-alias-border-l2': tokens.border.borderBase,
    '--dsw-alias-border-l3': tokens.border.borderFocus,
    '--dsw-alias-border-l4': tokens.border.borderFocus,
    '--dsw-alias-border-inverted': tokens.border.borderSubtle,
    '--dsw-alias-border-inverted2': tokens.border.borderSubtle,
    '--dsw-alias-border-l2-darkmode-thin': tokens.border.borderSubtle,

    // Brand & Interactive Controls
    '--dsw-alias-brand-primary': tokens.brand.brandPrimary,
    '--dsw-alias-brand-text': tokens.brand.brandText,
    '--dsw-alias-brand-primary-new-colorprimary-new-color': tokens.brand.brandPrimary,
    '--dsw-alias-brand-primary-invert': tokens.brand.brandPrimary,
    '--dsw-alias-button-primary-fill': tokens.brand.brandPrimary,
    '--dsw-alias-button-primary-hover': tokens.brand.brandHover,
    '--dsw-alias-button-info-fill': tokens.brand.brandPrimary,
    '--dsw-alias-button-info-hover': tokens.brand.brandHover,
    '--dsw-alias-button-elevated-fill': tokens.background.bgElevated,
    '--dsw-alias-button-floating-fill': tokens.background.bgElevated,
    '--dsw-alias-button-floating-hover': tokens.background.bgSurface,
    '--dsw-alias-button-ghost-active-fill': tokens.brand.brandSurface,
    '--dsw-alias-button-ghost-active-hover': tokens.background.bgSurface,
    '--dsw-alias-button-ghost-active-border': tokens.border.borderBase,
    '--dsw-alias-button-tool-bar-fill': tokens.background.bgSurface,
    '--dsw-alias-interactive-bg-hover': tokens.background.bgSurface,
    '--dsw-alias-interactive-bg-hover-accent': tokens.brand.brandSurface,
    '--dsw-alias-interactive-bg-active': tokens.brand.brandSurface,
    '--dsw-alias-interactive-bg-hover-solid': tokens.background.bgSurface,

    // Status & Semantic States
    '--dsw-alias-state-business-primary': tokens.brand.brandPrimary,
    '--dsw-alias-state-business-tertiary': tokens.brand.brandSurface,
    '--dsw-alias-state-success-primary': tokens.status.success,
    '--dsw-alias-state-success-secondary': tokens.status.success,
    '--dsw-alias-state-warn-primary': tokens.status.warning,
    '--dsw-alias-state-warn-secondary': tokens.status.warning,
    '--dsw-alias-state-warn-label': tokens.status.warning,
    '--dsw-alias-state-error-primary': tokens.status.error,
    '--dsw-alias-state-error-secondary': tokens.status.error,

    // Static DeepSeek & Bluish Palette Overrides
    '--dsw-static-deepseek-500': tokens.brand.brandPrimary,
    '--dsw-static-deepseek-450': tokens.brand.brandHover,
    '--dsw-static-deepseek-400': tokens.brand.brandHover,
    '--dsw-static-deepseek-300': tokens.brand.brandText,
    '--dsw-static-deepseek-200': tokens.brand.brandSurface,
    '--dsw-static-deepseek-100': tokens.brand.brandSurface,
    '--dsw-static-deepseek-50': tokens.brand.brandSurface,

    '--dsw-static-neutral-bluish-1000': tokens.background.bgSunken,
    '--dsw-static-neutral-bluish-950': tokens.background.bgBase,
    '--dsw-static-neutral-bluish-900': tokens.background.bgElevated,
    '--dsw-static-neutral-bluish-875': tokens.background.bgSubtle,
    '--dsw-static-neutral-bluish-850': tokens.background.bgSurface,
    '--dsw-static-neutral-bluish-800': tokens.border.borderBase,
    '--dsw-static-neutral-bluish-750': tokens.border.borderSubtle,
    '--dsw-static-neutral-bluish-700': tokens.text.textDisabled,
    '--dsw-static-neutral-bluish-600': tokens.text.textTertiary,
    '--dsw-static-neutral-bluish-500': tokens.text.textTertiary,
    '--dsw-static-neutral-bluish-400': tokens.text.textSecondary,
    '--dsw-static-neutral-bluish-300': tokens.text.textSecondary,
    '--dsw-static-neutral-bluish-200': tokens.text.textPrimary,
    '--dsw-static-neutral-bluish-100': tokens.text.textPrimary,
    '--dsw-static-neutral-bluish-50': tokens.text.textPrimary,
    '--dsw-static-neutral-bluish-00': tokens.text.textPrimary,

    // Fabric Theme Studio Scoped Aliases
    '--dsw-color-bg-base': tokens.background.bgBase,
    '--dsw-color-bg-elevated': tokens.background.bgElevated,
    '--dsw-color-bg-subtle': tokens.background.bgSubtle,
    '--dsw-color-bg-surface': tokens.background.bgSurface,
    '--dsw-color-bg-sunken': tokens.background.bgSunken,
    '--dsw-color-text-primary': tokens.text.textPrimary,
    '--dsw-color-text-secondary': tokens.text.textSecondary,
    '--dsw-color-text-tertiary': tokens.text.textTertiary,
    '--dsw-color-text-disabled': tokens.text.textDisabled,
    '--dsw-color-border-base': tokens.border.borderBase,
    '--dsw-color-border-subtle': tokens.border.borderSubtle,
    '--dsw-color-border-focus': tokens.border.borderFocus,
    '--dsw-color-brand-primary': tokens.brand.brandPrimary,
    '--dsw-color-brand-hover': tokens.brand.brandHover,
    '--dsw-color-brand-active': tokens.brand.brandActive,
    '--dsw-color-brand-surface': tokens.brand.brandSurface,
    '--dsw-color-brand-text': tokens.brand.brandText,
    '--dsw-color-accent-primary': tokens.accent.accentPrimary,
    '--dsw-color-accent-hover': tokens.accent.accentHover,
    '--dsw-color-accent-surface': tokens.accent.accentSurface,
    '--dsw-color-success-base': tokens.status.success,
    '--dsw-color-warning-base': tokens.status.warning,
    '--dsw-color-error-base': tokens.status.error,
    '--dsw-color-info-base': tokens.status.info,

    '--fts-bg-base': tokens.background.bgBase,
    '--fts-bg-elevated': tokens.background.bgElevated,
    '--fts-bg-subtle': tokens.background.bgSubtle,
    '--fts-bg-surface': tokens.background.bgSurface,
    '--fts-bg-sunken': tokens.background.bgSunken,
    '--fts-text-primary': tokens.text.textPrimary,
    '--fts-text-secondary': tokens.text.textSecondary,
    '--fts-text-tertiary': tokens.text.textTertiary,
    '--fts-text-disabled': tokens.text.textDisabled,
    '--fts-border-base': tokens.border.borderBase,
    '--fts-border-subtle': tokens.border.borderSubtle,
    '--fts-border-focus': tokens.border.borderFocus,
    '--fts-brand-primary': tokens.brand.brandPrimary,
    '--fts-brand-hover': tokens.brand.brandHover,
    '--fts-brand-active': tokens.brand.brandActive,
    '--fts-brand-surface': tokens.brand.brandSurface,
    '--fts-brand-text': tokens.brand.brandText,
    '--fts-accent-primary': tokens.accent.accentPrimary,
    '--fts-accent-hover': tokens.accent.accentHover,
    '--fts-accent-surface': tokens.accent.accentSurface,
    '--fts-status-success': tokens.status.success,
    '--fts-status-warning': tokens.status.warning,
    '--fts-status-error': tokens.status.error,
    '--fts-status-info': tokens.status.info,
    '--fts-radius-sm': tokens.shape.radiusSm,
    '--fts-radius-md': tokens.shape.radiusMd,
    '--fts-radius-lg': tokens.shape.radiusLg,
    '--fts-shadow-sm': tokens.shape.shadowSm,
    '--fts-shadow-md': tokens.shape.shadowMd,
    '--fts-shadow-lg': tokens.shape.shadowLg,
  }
}

/** Generate CSS variables mapping for a theme covering DSH aliases and specific variables. */
export function generateCssVariables(tokens: ThemeTokens): string {
  const dict = generateTokenDictionary(tokens)
  const lines: string[] = [
    ':root, body, body[data-ds-dark-theme], body[data-ds-light-theme], [data-fabric-theme] {',
  ]
  for (const [k, v] of Object.entries(dict)) {
    lines.push(`  ${k}: ${v} !important;`)
  }
  lines.push('}')
  return lines.join('\n')
}

export type ThemeStudioListener = () => void

/** Client-side Theme Studio Engine. */
export class ThemeStudioEngine {
  private activeThemeId: string = DEEPSEEK_CLASSIC.id
  private activeTheme: ThemeDefinition = DEEPSEEK_CLASSIC
  private customThemes: ThemeDefinition[] = []
  private autoFollowSystem: boolean = false
  private listeners: Set<ThemeStudioListener> = new Set()
  private initialized: boolean = false
  private syncSeq: number = 0
  private fabricThemeService: FabricThemeService | undefined
  private themeTeardown: (() => void) | undefined

  public constructor() {
    this.restoreFromStorage()
  }

  public init(themeService?: FabricThemeService): void {
    if (themeService) {
      this.fabricThemeService = themeService
    }
    if (this.initialized) return
    this.initialized = true

    this.applyThemeToDom(this.activeTheme)

    if (this.fabricThemeService) {
      this.themeTeardown = this.fabricThemeService.onThemeChange(({ dark }) => {
        if (this.autoFollowSystem) {
          const targetId = dark ? NORD_AURORA.id : SOLARIZED_LIGHT.id
          this.setActiveTheme(targetId)
        }
      })
    }

    void this.syncWithHost()
  }

  public getActiveTheme(): ThemeDefinition {
    return this.activeTheme
  }

  public getActiveThemeId(): string {
    return this.activeThemeId
  }

  public getAllThemes(): readonly ThemeDefinition[] {
    return [...BUILTIN_PRESETS, ...this.customThemes]
  }

  public getCustomThemes(): readonly ThemeDefinition[] {
    return this.customThemes
  }

  public getPresets(): readonly ThemeDefinition[] {
    return BUILTIN_PRESETS
  }

  public isAutoFollowSystem(): boolean {
    return this.autoFollowSystem
  }

  public setAutoFollowSystem(enabled: boolean): void {
    this.autoFollowSystem = enabled
    this.persistToStorage()
    if (enabled && this.fabricThemeService) {
      const isDark = this.fabricThemeService.isDark()
      const targetId = isDark ? NORD_AURORA.id : SOLARIZED_LIGHT.id
      this.setActiveTheme(targetId)
    }
    this.notify()
  }

  public subscribe(listener: ThemeStudioListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  public setActiveTheme(themeId: string): boolean {
    const all = this.getAllThemes()
    const target = all.find(t => t.id === themeId)
    if (!target) return false

    this.syncSeq++
    this.activeThemeId = target.id
    this.activeTheme = target
    this.applyThemeToDom(target)
    this.persistToStorage()
    this.notify()
    void this.pushActiveToHost(target.id)
    return true
  }

  public applyCustomThemeDraft(theme: ThemeDefinition): void {
    this.activeTheme = theme
    this.applyThemeToDom(theme)
    this.notify()
  }

  public saveCustomTheme(theme: ThemeDefinition): void {
    const index = this.customThemes.findIndex(t => t.id === theme.id)
    const normalized: ThemeDefinition = {
      ...theme,
      isBuiltin: false,
      contrastRating: evaluateContrastGrade(
        calculateContrastRatio(theme.tokens.background.bgBase, theme.tokens.text.textPrimary),
      ),
    }

    if (index >= 0) {
      this.customThemes[index] = normalized
    } else {
      this.customThemes.push(normalized)
    }

    this.syncSeq++
    this.activeThemeId = normalized.id
    this.activeTheme = normalized
    this.applyThemeToDom(normalized)
    this.persistToStorage()
    this.notify()
    void this.pushCustomToHost(normalized)
  }

  public deleteCustomTheme(themeId: string): boolean {
    const initialLen = this.customThemes.length
    this.customThemes = this.customThemes.filter(t => t.id !== themeId)
    if (this.customThemes.length === initialLen) return false

    this.syncSeq++
    if (this.activeThemeId === themeId) {
      this.setActiveTheme(DEEPSEEK_CLASSIC.id)
    } else {
      this.persistToStorage()
      this.notify()
    }
    void this.pushDeleteToHost(themeId)
    return true
  }

  public resetAll(): void {
    this.syncSeq++
    this.customThemes = []
    this.autoFollowSystem = false
    this.setActiveTheme(DEEPSEEK_CLASSIC.id)
    this.persistToStorage()
    this.notify()
    void this.pushResetToHost()
  }

  public dispose(): void {
    if (this.themeTeardown) {
      this.themeTeardown()
      this.themeTeardown = undefined
    }
    if (this.fabricThemeService) {
      this.fabricThemeService.clearTokens('fabric-theme-studio')
    }
    if (typeof document !== 'undefined') {
      const tag = document.getElementById(STYLE_TAG_ID)
      if (tag) tag.remove()
      document.body.removeAttribute('data-fabric-theme')
      document.body.removeAttribute('data-fabric-theme-mode')
    }
    this.listeners.clear()
    this.initialized = false
  }

  private applyThemeToDom(theme: ThemeDefinition): void {
    const dict = generateTokenDictionary(theme.tokens)

    // Primary path: Use Fabric Theme Bridge service if available
    if (this.fabricThemeService) {
      this.fabricThemeService.setTokens('fabric-theme-studio', dict, {
        priority: 100,
        scope: 'global',
      })
    }

    // Secondary path: Maintain DOM data attributes and fallback style tag
    if (typeof document !== 'undefined') {
      let styleTag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null
      if (!styleTag) {
        styleTag = document.createElement('style')
        styleTag.id = STYLE_TAG_ID
        styleTag.setAttribute('data-plugin', 'fabric-theme-studio')
      }
      document.head?.appendChild(styleTag)
      styleTag.textContent = generateCssVariables(theme.tokens)

      document.body.setAttribute('data-fabric-theme', theme.id)
      document.body.setAttribute('data-fabric-theme-mode', theme.category)
      if (theme.category === 'light') {
        document.body.setAttribute('data-ds-light-theme', '')
        document.body.removeAttribute('data-ds-dark-theme')
      } else {
        document.body.setAttribute('data-ds-dark-theme', '')
        document.body.removeAttribute('data-ds-light-theme')
      }
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener()
      } catch (err) {
        console.error('fabric-theme-studio: listener error', err)
      }
    }
  }

  private restoreFromStorage(): void {
    if (typeof localStorage === 'undefined') return
    try {
      const savedAuto = localStorage.getItem(STORAGE_KEY_AUTO)
      if (savedAuto) {
        this.autoFollowSystem = savedAuto === 'true'
      }
      const savedCustom = localStorage.getItem(STORAGE_KEY_CUSTOM)
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom) as ThemeDefinition[]
        if (Array.isArray(parsed)) {
          this.customThemes = parsed
        }
      }
      const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE)
      if (savedActive) {
        const all = this.getAllThemes()
        const match = all.find(t => t.id === savedActive)
        if (match) {
          this.activeThemeId = match.id
          this.activeTheme = match
        }
      }
    } catch {
      // ignore storage access errors
    }
  }

  private persistToStorage(): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, this.activeThemeId)
      localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(this.customThemes))
      localStorage.setItem(STORAGE_KEY_AUTO, String(this.autoFollowSystem))
    } catch {
      // ignore storage access errors
    }
  }

  private async syncWithHost(): Promise<void> {
    if (typeof fetch === 'undefined') return
    const currentSeq = this.syncSeq
    try {
      const res = await fetch('/api/theme-studio/state')
      if (res.ok) {
        const json = (await res.json()) as { ok: boolean; data?: ThemeStudioStatePayload }
        if (json.ok && json.data) {
          const payload = json.data
          if (payload.customThemes && payload.customThemes.length > 0) {
            this.customThemes = [...payload.customThemes]
          }
          if (this.syncSeq === currentSeq && payload.activeThemeId) {
            const all = this.getAllThemes()
            const match = all.find(t => t.id === payload.activeThemeId)
            if (match) {
              this.activeThemeId = match.id
              this.activeTheme = match
              this.applyThemeToDom(match)
            }
          }
          this.notify()
        }
      }
    } catch {
      // host offline or not reachable, fallback to local storage
    }
  }

  private async pushActiveToHost(themeId: string): Promise<void> {
    if (typeof fetch === 'undefined') return
    try {
      await fetch('/api/theme-studio/active', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ themeId }),
      })
    } catch {
      // ignore host errors
    }
  }

  private async pushCustomToHost(theme: ThemeDefinition): Promise<void> {
    if (typeof fetch === 'undefined') return
    try {
      await fetch('/api/theme-studio/custom', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ theme }),
      })
    } catch {
      // ignore host errors
    }
  }

  private async pushDeleteToHost(themeId: string): Promise<void> {
    if (typeof fetch === 'undefined') return
    try {
      await fetch(`/api/theme-studio/custom?themeId=${encodeURIComponent(themeId)}`, {
        method: 'DELETE',
      })
    } catch {
      // ignore host errors
    }
  }

  private async pushResetToHost(): Promise<void> {
    if (typeof fetch === 'undefined') return
    try {
      await fetch('/api/theme-studio/reset', { method: 'POST' })
    } catch {
      // ignore host errors
    }
  }
}

/** Global theme engine singleton for the client bundle. */
export const themeEngine = new ThemeStudioEngine()

/** Custom hook to consume theme studio reactive state. */
export function useThemeStudio(): {
  activeTheme: ThemeDefinition
  activeThemeId: string
  allThemes: readonly ThemeDefinition[]
  presets: readonly ThemeDefinition[]
  customThemes: readonly ThemeDefinition[]
  autoFollowSystem: boolean
  setAutoFollowSystem: (enabled: boolean) => void
  setActiveTheme: (id: string) => boolean
  applyCustomThemeDraft: (theme: ThemeDefinition) => void
  saveCustomTheme: (theme: ThemeDefinition) => void
  deleteCustomTheme: (id: string) => boolean
  resetAll: () => void
} {
  const [, setVersion] = useState(0)

  useEffect(() => {
    themeEngine.init()
    const unsubscribe = themeEngine.subscribe(() => {
      setVersion(v => v + 1)
    })
    return unsubscribe
  }, [])

  return {
    activeTheme: themeEngine.getActiveTheme(),
    activeThemeId: themeEngine.getActiveThemeId(),
    allThemes: themeEngine.getAllThemes(),
    presets: themeEngine.getPresets(),
    customThemes: themeEngine.getCustomThemes(),
    autoFollowSystem: themeEngine.isAutoFollowSystem(),
    setAutoFollowSystem: (enabled: boolean) => themeEngine.setAutoFollowSystem(enabled),
    setActiveTheme: (id: string) => themeEngine.setActiveTheme(id),
    applyCustomThemeDraft: (theme: ThemeDefinition) => themeEngine.applyCustomThemeDraft(theme),
    saveCustomTheme: (theme: ThemeDefinition) => themeEngine.saveCustomTheme(theme),
    deleteCustomTheme: (id: string) => themeEngine.deleteCustomTheme(id),
    resetAll: () => themeEngine.resetAll(),
  }
}
