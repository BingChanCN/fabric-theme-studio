import { useEffect, useState } from 'react'
import { BUILTIN_PRESETS, DEEPSEEK_CLASSIC } from '../presets.ts'
import type { ContrastGrade, ThemeDefinition, ThemeStudioStatePayload, ThemeTokens } from '../types.ts'

const STORAGE_KEY_ACTIVE = 'fabric_theme_studio_active_id'
const STORAGE_KEY_CUSTOM = 'fabric_theme_studio_custom_themes'
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

/** Generate CSS variables mapping for a theme covering DSH aliases, specific variables, and statics. */
export function generateCssVariables(tokens: ThemeTokens): string {
  const lines: string[] = [
    ':root, body, body[data-ds-dark-theme], body[data-ds-light-theme], [data-fabric-theme] {',
    '  /* DSH Core Background & Container Aliases */',
    `  --dsw-alias-bg-base: ${tokens.background.bgBase} !important;`,
    `  --dsw-alias-bg-layer-1: ${tokens.background.bgElevated} !important;`,
    `  --dsw-alias-bg-layer-2: ${tokens.background.bgSubtle} !important;`,
    `  --dsw-alias-bg-layer-3: ${tokens.background.bgSurface} !important;`,
    `  --dsw-alias-bg-overlay: ${tokens.background.bgElevated} !important;`,
    `  --dsw-alias-bg-module-platform: ${tokens.background.bgElevated} !important;`,
    `  --dsw-alias-bg-multi-select: ${tokens.background.bgSurface} !important;`,
    `  --dsw-alias-bg-skeleton: ${tokens.background.bgSubtle} !important;`,
    '',
    '  /* DSH Specific UI Components */',
    `  --dsw-specific-sidebar-fill: ${tokens.background.bgElevated} !important;`,
    `  --dsw-specific-sidebar-nav-item-active: ${tokens.brand.brandSurface} !important;`,
    `  --dsw-specific-sidebar-nav-item-active-accent: ${tokens.brand.brandPrimary} !important;`,
    `  --dsw-specific-sidebar-nav-item-hover: ${tokens.background.bgSurface} !important;`,
    `  --dsw-specific-input-major: ${tokens.background.bgSunken} !important;`,
    `  --dsw-specific-login-input: ${tokens.background.bgSunken} !important;`,
    `  --dsw-specific-bubble: ${tokens.background.bgElevated} !important;`,
    `  --dsw-specific-bubble-highlight: ${tokens.brand.brandSurface} !important;`,
    `  --dsw-specific-selector: ${tokens.background.bgSurface} !important;`,
    `  --dsw-specific-tip: ${tokens.background.bgSurface} !important;`,
    `  --dsw-specific-menu: ${tokens.background.bgElevated} !important;`,
    '',
    '  /* Typography / Text Hierarchy */',
    `  --dsw-alias-label-primary: ${tokens.text.textPrimary} !important;`,
    `  --dsw-alias-label-primary-bluish: ${tokens.text.textPrimary} !important;`,
    `  --dsw-alias-label-primary-dimmed: ${tokens.text.textSecondary} !important;`,
    `  --dsw-alias-label-primary-foreground: ${tokens.text.textPrimary} !important;`,
    `  --dsw-alias-label-primary-inverted: ${tokens.background.bgBase} !important;`,
    `  --dsw-alias-label-secondary: ${tokens.text.textSecondary} !important;`,
    `  --dsw-alias-label-tertiary: ${tokens.text.textTertiary} !important;`,
    `  --dsw-alias-label-caption: ${tokens.text.textDisabled} !important;`,
    `  --dsw-alias-label-dimmed: ${tokens.text.textDisabled} !important;`,
    '',
    '  /* Dividers & Borders */',
    `  --dsw-alias-border-l1: ${tokens.border.borderSubtle} !important;`,
    `  --dsw-alias-border-l2: ${tokens.border.borderBase} !important;`,
    `  --dsw-alias-border-l3: ${tokens.border.borderFocus} !important;`,
    `  --dsw-alias-border-l4: ${tokens.border.borderFocus} !important;`,
    `  --dsw-alias-border-inverted: ${tokens.border.borderSubtle} !important;`,
    `  --dsw-alias-border-inverted2: ${tokens.border.borderSubtle} !important;`,
    `  --dsw-alias-border-l2-darkmode-thin: ${tokens.border.borderSubtle} !important;`,
    '',
    '  /* Brand & Interactive Controls */',
    `  --dsw-alias-brand-primary: ${tokens.brand.brandPrimary} !important;`,
    `  --dsw-alias-brand-text: ${tokens.brand.brandText} !important;`,
    `  --dsw-alias-brand-primary-new-colorprimary-new-color: ${tokens.brand.brandPrimary} !important;`,
    `  --dsw-alias-brand-primary-invert: ${tokens.brand.brandPrimary} !important;`,
    `  --dsw-alias-button-primary-fill: ${tokens.brand.brandPrimary} !important;`,
    `  --dsw-alias-button-primary-hover: ${tokens.brand.brandHover} !important;`,
    `  --dsw-alias-button-info-fill: ${tokens.brand.brandPrimary} !important;`,
    `  --dsw-alias-button-info-hover: ${tokens.brand.brandHover} !important;`,
    `  --dsw-alias-button-elevated-fill: ${tokens.background.bgElevated} !important;`,
    `  --dsw-alias-button-floating-fill: ${tokens.background.bgElevated} !important;`,
    `  --dsw-alias-button-floating-hover: ${tokens.background.bgSurface} !important;`,
    `  --dsw-alias-button-ghost-active-fill: ${tokens.brand.brandSurface} !important;`,
    `  --dsw-alias-button-ghost-active-hover: ${tokens.background.bgSurface} !important;`,
    `  --dsw-alias-button-ghost-active-border: ${tokens.border.borderBase} !important;`,
    `  --dsw-alias-button-tool-bar-fill: ${tokens.background.bgSurface} !important;`,
    `  --dsw-alias-interactive-bg-hover: ${tokens.background.bgSurface} !important;`,
    `  --dsw-alias-interactive-bg-hover-accent: ${tokens.brand.brandSurface} !important;`,
    `  --dsw-alias-interactive-bg-active: ${tokens.brand.brandSurface} !important;`,
    `  --dsw-alias-interactive-bg-hover-solid: ${tokens.background.bgSurface} !important;`,
    '',
    '  /* Status & Semantic States */',
    `  --dsw-alias-state-business-primary: ${tokens.brand.brandPrimary} !important;`,
    `  --dsw-alias-state-business-tertiary: ${tokens.brand.brandSurface} !important;`,
    `  --dsw-alias-state-success-primary: ${tokens.status.success} !important;`,
    `  --dsw-alias-state-success-secondary: ${tokens.status.success} !important;`,
    `  --dsw-alias-state-warn-primary: ${tokens.status.warning} !important;`,
    `  --dsw-alias-state-warn-secondary: ${tokens.status.warning} !important;`,
    `  --dsw-alias-state-warn-label: ${tokens.status.warning} !important;`,
    `  --dsw-alias-state-error-primary: ${tokens.status.error} !important;`,
    `  --dsw-alias-state-error-secondary: ${tokens.status.error} !important;`,
    '',
    '  /* Static Palette Overrides for DeepSeek & Bluish Neutrals */',
    `  --dsw-static-deepseek-500: ${tokens.brand.brandPrimary} !important;`,
    `  --dsw-static-deepseek-450: ${tokens.brand.brandHover} !important;`,
    `  --dsw-static-deepseek-400: ${tokens.brand.brandHover} !important;`,
    `  --dsw-static-deepseek-300: ${tokens.brand.brandText} !important;`,
    `  --dsw-static-deepseek-200: ${tokens.brand.brandSurface} !important;`,
    `  --dsw-static-deepseek-100: ${tokens.brand.brandSurface} !important;`,
    `  --dsw-static-deepseek-50: ${tokens.brand.brandSurface} !important;`,
    `  --dsw-static-neutral-bluish-1000: ${tokens.background.bgSunken} !important;`,
    `  --dsw-static-neutral-bluish-950: ${tokens.background.bgBase} !important;`,
    `  --dsw-static-neutral-bluish-900: ${tokens.background.bgElevated} !important;`,
    `  --dsw-static-neutral-bluish-875: ${tokens.background.bgSubtle} !important;`,
    `  --dsw-static-neutral-bluish-850: ${tokens.background.bgSurface} !important;`,
    `  --dsw-static-neutral-bluish-800: ${tokens.border.borderBase} !important;`,
    `  --dsw-static-neutral-bluish-750: ${tokens.border.borderSubtle} !important;`,
    `  --dsw-static-neutral-bluish-700: ${tokens.text.textDisabled} !important;`,
    `  --dsw-static-neutral-bluish-600: ${tokens.text.textTertiary} !important;`,
    `  --dsw-static-neutral-bluish-500: ${tokens.text.textTertiary} !important;`,
    `  --dsw-static-neutral-bluish-400: ${tokens.text.textSecondary} !important;`,
    `  --dsw-static-neutral-bluish-300: ${tokens.text.textSecondary} !important;`,
    `  --dsw-static-neutral-bluish-200: ${tokens.text.textPrimary} !important;`,
    `  --dsw-static-neutral-bluish-100: ${tokens.text.textPrimary} !important;`,
    `  --dsw-static-neutral-bluish-50: ${tokens.text.textPrimary} !important;`,
    `  --dsw-static-neutral-bluish-00: ${tokens.text.textPrimary} !important;`,
    '',
    '  /* Fabric Theme Studio Scope Variables */',
    `  --dsw-color-bg-base: ${tokens.background.bgBase} !important;`,
    `  --dsw-color-bg-elevated: ${tokens.background.bgElevated} !important;`,
    `  --dsw-color-bg-subtle: ${tokens.background.bgSubtle} !important;`,
    `  --dsw-color-bg-surface: ${tokens.background.bgSurface} !important;`,
    `  --dsw-color-bg-sunken: ${tokens.background.bgSunken} !important;`,
    `  --dsw-color-text-primary: ${tokens.text.textPrimary} !important;`,
    `  --dsw-color-text-secondary: ${tokens.text.textSecondary} !important;`,
    `  --dsw-color-text-tertiary: ${tokens.text.textTertiary} !important;`,
    `  --dsw-color-text-disabled: ${tokens.text.textDisabled} !important;`,
    `  --dsw-color-border-base: ${tokens.border.borderBase} !important;`,
    `  --dsw-color-border-subtle: ${tokens.border.borderSubtle} !important;`,
    `  --dsw-color-border-focus: ${tokens.border.borderFocus} !important;`,
    `  --dsw-color-brand-primary: ${tokens.brand.brandPrimary} !important;`,
    `  --dsw-color-brand-hover: ${tokens.brand.brandHover} !important;`,
    `  --dsw-color-brand-active: ${tokens.brand.brandActive} !important;`,
    `  --dsw-color-brand-surface: ${tokens.brand.brandSurface} !important;`,
    `  --dsw-color-brand-text: ${tokens.brand.brandText} !important;`,
    `  --dsw-color-accent-primary: ${tokens.accent.accentPrimary} !important;`,
    `  --dsw-color-accent-hover: ${tokens.accent.accentHover} !important;`,
    `  --dsw-color-accent-surface: ${tokens.accent.accentSurface} !important;`,
    `  --dsw-color-success-base: ${tokens.status.success} !important;`,
    `  --dsw-color-warning-base: ${tokens.status.warning} !important;`,
    `  --dsw-color-error-base: ${tokens.status.error} !important;`,
    `  --dsw-color-info-base: ${tokens.status.info} !important;`,
    `  --dsw-radius-sm: ${tokens.shape.radiusSm} !important;`,
    `  --dsw-radius-md: ${tokens.shape.radiusMd} !important;`,
    `  --dsw-radius-lg: ${tokens.shape.radiusLg} !important;`,
    `  --dsw-shadow-sm: ${tokens.shape.shadowSm} !important;`,
    `  --dsw-shadow-md: ${tokens.shape.shadowMd} !important;`,
    `  --dsw-shadow-lg: ${tokens.shape.shadowLg} !important;`,
    '',
    `  --fts-bg-base: ${tokens.background.bgBase} !important;`,
    `  --fts-bg-elevated: ${tokens.background.bgElevated} !important;`,
    `  --fts-bg-subtle: ${tokens.background.bgSubtle} !important;`,
    `  --fts-bg-surface: ${tokens.background.bgSurface} !important;`,
    `  --fts-bg-sunken: ${tokens.background.bgSunken} !important;`,
    `  --fts-text-primary: ${tokens.text.textPrimary} !important;`,
    `  --fts-text-secondary: ${tokens.text.textSecondary} !important;`,
    `  --fts-text-tertiary: ${tokens.text.textTertiary} !important;`,
    `  --fts-text-disabled: ${tokens.text.textDisabled} !important;`,
    `  --fts-border-base: ${tokens.border.borderBase} !important;`,
    `  --fts-border-subtle: ${tokens.border.borderSubtle} !important;`,
    `  --fts-border-focus: ${tokens.border.borderFocus} !important;`,
    `  --fts-brand-primary: ${tokens.brand.brandPrimary} !important;`,
    `  --fts-brand-hover: ${tokens.brand.brandHover} !important;`,
    `  --fts-brand-active: ${tokens.brand.brandActive} !important;`,
    `  --fts-brand-surface: ${tokens.brand.brandSurface} !important;`,
    `  --fts-brand-text: ${tokens.brand.brandText} !important;`,
    `  --fts-accent-primary: ${tokens.accent.accentPrimary} !important;`,
    `  --fts-accent-hover: ${tokens.accent.accentHover} !important;`,
    `  --fts-accent-surface: ${tokens.accent.accentSurface} !important;`,
    `  --fts-status-success: ${tokens.status.success} !important;`,
    `  --fts-status-warning: ${tokens.status.warning} !important;`,
    `  --fts-status-error: ${tokens.status.error} !important;`,
    `  --fts-status-info: ${tokens.status.info} !important;`,
    `  --fts-radius-sm: ${tokens.shape.radiusSm} !important;`,
    `  --fts-radius-md: ${tokens.shape.radiusMd} !important;`,
    `  --fts-radius-lg: ${tokens.shape.radiusLg} !important;`,
    `  --fts-shadow-sm: ${tokens.shape.shadowSm} !important;`,
    `  --fts-shadow-md: ${tokens.shape.shadowMd} !important;`,
    `  --fts-shadow-lg: ${tokens.shape.shadowLg} !important;`,
    '}',
  ]
  return lines.join('\n')
}

export type ThemeStudioListener = () => void

/** Client-side Theme Studio Engine. */
export class ThemeStudioEngine {
  private activeThemeId: string = DEEPSEEK_CLASSIC.id
  private activeTheme: ThemeDefinition = DEEPSEEK_CLASSIC
  private customThemes: ThemeDefinition[] = []
  private listeners: Set<ThemeStudioListener> = new Set()
  private initialized: boolean = false
  private syncSeq: number = 0

  public constructor() {
    this.restoreFromStorage()
  }

  public init(): void {
    if (this.initialized) return
    this.initialized = true
    this.applyThemeToDom(this.activeTheme)
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
    this.setActiveTheme(DEEPSEEK_CLASSIC.id)
    this.persistToStorage()
    this.notify()
    void this.pushResetToHost()
  }

  public dispose(): void {
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
    if (typeof document === 'undefined') return
    let styleTag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null
    if (!styleTag) {
      styleTag = document.createElement('style')
      styleTag.id = STYLE_TAG_ID
      styleTag.setAttribute('data-plugin', 'fabric-theme-studio')
    }
    // Always move to the end of head so it takes highest cascade priority
    document.head.appendChild(styleTag)
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
    setActiveTheme: (id: string) => themeEngine.setActiveTheme(id),
    applyCustomThemeDraft: (theme: ThemeDefinition) => themeEngine.applyCustomThemeDraft(theme),
    saveCustomTheme: (theme: ThemeDefinition) => themeEngine.saveCustomTheme(theme),
    deleteCustomTheme: (id: string) => themeEngine.deleteCustomTheme(id),
    resetAll: () => themeEngine.resetAll(),
  }
}
