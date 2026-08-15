import { useEffect, useState } from 'react'
import type { FabricResourceClient, FabricThemeDefinition, FabricThemeProvider } from '@dsh-do/fabric/client'
import {
  customThemeResource, resetThemeResource, setActiveThemeResource,
  themeStudioStateResource, wallpaperResource,
} from '../resources.ts'
import {
  BUILTIN_PRESETS,
  CATPPUCCIN_LATTE,
  CATPPUCCIN_MOCHA,
  CYBERPUNK_NEON,
  DEEPSEEK_CLASSIC,
  GITHUB_LIGHT,
  GRUVBOX_RETRO,
  MONOCHROME_PRO,
  NORD_AURORA,
  ONE_LIGHT,
  SOLARIZED_LIGHT,
  TOKYO_NIGHT,
} from '../presets.ts'
import type {
  BackgroundEffect,
  ContrastGrade,
  EffectSpeed,
  ThemeDefinition,
  ThemeMaterial,
  ThemeStudioStatePayload,
  ThemeWallpaper,
} from '../types.ts'

const STORAGE_KEY_ACTIVE = 'fabric_theme_studio_active_id'
const STORAGE_KEY_CUSTOM = 'fabric_theme_studio_custom_themes'
const STORAGE_KEY_AUTO = 'fabric_theme_studio_auto_system'
const STORAGE_KEY_EFFECT_ENABLED = 'fabric_theme_studio_effects_enabled'

const STYLE_TAG_ID = 'fabric-theme-studio-injected-style'
const BACKDROP_CONTAINER_ID = 'fabric-theme-backdrop'
const NOISE_CONTAINER_ID = 'fabric-theme-backdrop-noise'
const WALLPAPER_CONTAINER_ID = 'fabric-theme-wallpaper'

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

/** Convert a hex/rgb color to an rgba() string. Falls back to the original if unparsable. */
export function colorToRgba(color: string, alpha: number): string {
  const rgb = parseColorToRgb(color)
  if (!rgb) return color
  const a = Math.min(1, Math.max(0, alpha))
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`
}

/** DSH-style status ramp: primary is text, secondary/tertiary are translucent fills. */
export function deriveStateRamp(color: string, isLight: boolean): {
  primary: string
  secondary: string
  tertiary: string
} {
  return {
    primary: color,
    secondary: colorToRgba(color, isLight ? 0.16 : 0.24),
    tertiary: colorToRgba(color, isLight ? 0.12 : 0.18),
  }
}

/** Keep a surface token distinct from its foreground when a theme collapsed them. */
export function distinctSurface(surface: string, foreground: string, isLight: boolean): string {
  if (surface.trim().toLowerCase() === foreground.trim().toLowerCase()) {
    return colorToRgba(foreground, isLight ? 0.16 : 0.24)
  }
  return surface
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

/** Generate the theme-specific ambient layer stylesheet. */
function generateAmbientCss(material?: ThemeMaterial): string {
  const lines: string[] = []
  const wallpaper = material?.wallpaper
  const hasWallpaper = Boolean(wallpaper?.enabled && wallpaper.url)

  // Wallpaper layer styling
  if (hasWallpaper && wallpaper?.url) {
    const fit = wallpaper.fit ?? 'cover'
    const size = fit === 'contain' ? 'contain' : fit === 'tile' ? 'auto' : fit === 'center' ? 'auto' : 'cover'
    const repeat = fit === 'tile' ? 'repeat' : 'no-repeat'
    const blur = Math.max(0, Math.min(30, wallpaper.blur ?? 0))
    const opacity = Math.max(0, Math.min(1, wallpaper.opacity ?? 1))
    const scale = blur > 0 ? '1.04' : '1'

    lines.push(`
#${WALLPAPER_CONTAINER_ID} {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  pointer-events: none !important;
  z-index: 0 !important;
  background-image: url(${JSON.stringify(wallpaper.url)}) !important;
  background-size: ${size} !important;
  background-repeat: ${repeat} !important;
  background-position: center center !important;
  background-attachment: fixed !important;
  opacity: ${opacity} !important;
  filter: ${blur > 0 ? `blur(${blur}px)` : 'none'} !important;
  transform: scale(${scale}) !important;
  transition: opacity 0.4s ease, filter 0.4s ease !important;
  display: block !important;
}

html[data-fabric-has-wallpaper="true"] #root,
body[data-fabric-has-wallpaper="true"] #root {
  position: relative !important;
  z-index: 1 !important;
}
`)
  } else {
    lines.push(`
#${WALLPAPER_CONTAINER_ID} {
  display: none !important;
}
`)
  }

  // Ambient lives on the Fabric workbench drawer (data-fabric-workbench),
  // not on a z-index:-1 body child that AppFrame's opaque bg-base covers.
  lines.push(`
#${NOISE_CONTAINER_ID} {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 2147483000;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.7'/%3E%3C/svg%3E");
  background-repeat: repeat;
  mix-blend-mode: overlay;
  opacity: var(--fabric-material-noise-opacity, 0);
  transition: opacity 0.3s ease;
}

body[data-fabric-ambient-speed="slow"] [data-fabric-workbench="true"] {
  --fts-ambient-duration: 36s;
  --fts-ambient-duration-alt: 44s;
  --fts-scan-duration: 16s;
}
body[data-fabric-ambient-speed="normal"] [data-fabric-workbench="true"] {
  --fts-ambient-duration: 24s;
  --fts-ambient-duration-alt: 30s;
  --fts-scan-duration: 10s;
}
body[data-fabric-ambient-speed="fast"] [data-fabric-workbench="true"] {
  --fts-ambient-duration: 12s;
  --fts-ambient-duration-alt: 16s;
  --fts-scan-duration: 6s;
}

body[data-fabric-ambient="aurora"] [data-fabric-workbench="true"]::before {
  content: "";
  position: absolute;
  top: -18%;
  left: -16%;
  width: 80%;
  height: 78%;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(circle, var(--fabric-accent-primary, #4176e6) 0%, transparent 68%);
  filter: blur(42px);
  opacity: calc(0.62 * var(--fabric-ambient-intensity, 0.75));
  animation: fts-aurora-drift var(--fts-ambient-duration, 24s) ease-in-out infinite alternate;
}

body[data-fabric-ambient="aurora"] [data-fabric-workbench="true"]::after {
  content: "";
  position: absolute;
  bottom: -22%;
  right: -14%;
  width: 72%;
  height: 72%;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(circle, var(--fabric-accent-primary, #ff77c6) 0%, transparent 68%);
  filter: blur(48px);
  opacity: calc(0.5 * var(--fabric-ambient-intensity, 0.75));
  animation: fts-aurora-orbit var(--fts-ambient-duration-alt, 30s) ease-in-out infinite alternate-reverse;
}

@keyframes fts-aurora-drift {
  0% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(10%, 8%, 0) scale(1.1); }
  100% { transform: translate3d(-8%, 12%, 0) scale(0.96); }
}

@keyframes fts-aurora-orbit {
  0% { transform: translate3d(0, 0, 0) rotate(0deg); }
  100% { transform: translate3d(-12%, -10%, 0) rotate(180deg); }
}

body[data-fabric-ambient="cyber-grid"] [data-fabric-workbench="true"]::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    linear-gradient(rgba(255, 0, 127, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 255, 0.14) 1px, transparent 1px);
  background-size: 32px 32px;
  opacity: var(--fabric-ambient-intensity, 0.85);
}

body[data-fabric-ambient="cyber-grid"] [data-fabric-workbench="true"]::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 255, 255, 0.2) 50%, transparent 100%);
  background-size: 100% 220%;
  animation: fts-scanline var(--fts-scan-duration, 10s) linear infinite;
  opacity: var(--fabric-ambient-intensity, 0.85);
}

@keyframes fts-scanline {
  0% { background-position: 0 0; }
  100% { background-position: 0 220%; }
}

body[data-fabric-ambient="mesh-gradient"] [data-fabric-workbench="true"]::before {
  content: "";
  position: absolute;
  inset: -20%;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(at 0% 0%, var(--fabric-accent-primary, #cba6f7) 0px, transparent 50%),
    radial-gradient(at 100% 0%, var(--fabric-accent-primary, #f5c2e7) 0px, transparent 50%),
    radial-gradient(at 50% 100%, var(--fabric-accent-hover, #89b4fa) 0px, transparent 50%);
  filter: blur(48px);
  opacity: calc(0.42 * var(--fabric-ambient-intensity, 0.75));
  animation: fts-mesh-pulse var(--fts-ambient-duration, 16s) ease-in-out infinite alternate;
}

@keyframes fts-mesh-pulse {
  0% { transform: scale(1); filter: blur(48px) hue-rotate(0deg); }
  100% { transform: scale(1.08); filter: blur(56px) hue-rotate(24deg); }
}

body[data-fabric-ambient="spotlight"] [data-fabric-workbench="true"]::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(circle at 50% 24%, var(--fabric-accent-primary, #4176e6) 0%, transparent 58%);
  filter: blur(52px);
  opacity: calc(0.4 * var(--fabric-ambient-intensity, 0.75));
}

body[data-fabric-ambient-paused="true"] [data-fabric-workbench="true"]::before,
body[data-fabric-ambient-paused="true"] [data-fabric-workbench="true"]::after {
  animation-play-state: paused !important;
}

@media (prefers-reduced-motion: reduce) {
  [data-fabric-workbench="true"]::before,
  [data-fabric-workbench="true"]::after {
    animation: none !important;
  }
}
`)

  return lines.join('\n')
}

export function toFabricTheme(theme: ThemeDefinition): FabricThemeDefinition {
  const isLight = theme.category === 'light'
  const success = deriveStateRamp(theme.tokens.status.success, isLight)
  const warning = deriveStateRamp(theme.tokens.status.warning, isLight)
  const danger = deriveStateRamp(theme.tokens.status.error, isLight)
  const info = deriveStateRamp(theme.tokens.status.info, isLight)
  const material = theme.material
  const wallpaper = material?.wallpaper
  const baseFill = wallpaper?.enabled === true && wallpaper.url
    ? colorToRgba(theme.tokens.background.bgBase, Math.min(1, Math.max(0, wallpaper.dim ?? 0.55)))
    : theme.tokens.background.bgBase
  return {
    surface: {
      base: baseFill,
      raised: theme.tokens.background.bgElevated,
      sunken: theme.tokens.background.bgSunken,
      muted: theme.tokens.background.bgSubtle,
      overlay: theme.tokens.background.bgSurface,
    },
    content: {
      primary: theme.tokens.text.textPrimary,
      secondary: theme.tokens.text.textSecondary,
      tertiary: theme.tokens.text.textTertiary,
      disabled: theme.tokens.text.textDisabled,
      inverse: theme.tokens.background.bgBase,
    },
    border: {
      subtle: theme.tokens.border.borderSubtle,
      default: theme.tokens.border.borderBase,
      strong: theme.tokens.border.borderFocus,
      focus: theme.tokens.border.borderFocus,
    },
    accent: {
      primary: theme.tokens.brand.brandPrimary,
      hover: theme.tokens.brand.brandHover,
      active: theme.tokens.brand.brandActive,
      surface: distinctSurface(theme.tokens.brand.brandSurface, theme.tokens.brand.brandPrimary, isLight),
    },
    state: {
      info: { foreground: info.primary, surface: info.secondary, border: info.tertiary },
      success: { foreground: success.primary, surface: success.secondary, border: success.tertiary },
      warning: { foreground: warning.primary, surface: warning.secondary, border: warning.tertiary },
      danger: { foreground: danger.primary, surface: danger.secondary, border: danger.tertiary },
    },
    interaction: {
      hover: theme.tokens.background.bgSurface,
      active: theme.tokens.brand.brandSurface,
      selected: theme.tokens.brand.brandSurface,
      focus: theme.tokens.border.borderFocus,
    },
    material: {
      acrylicBackground: material?.acrylic === true
        ? colorToRgba(theme.tokens.background.bgElevated, isLight ? 0.8 : 0.72)
        : theme.tokens.background.bgBase,
      acrylicFilter: material?.acrylic === true ? 'blur(16px)' : 'none',
      edgeHighlight: material?.edgeHighlight === true
        ? (isLight ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.7), inset 0 -1px 0 0 rgba(0, 0, 0, 0.06)' : 'inset 0 1px 0 0 rgba(255, 255, 255, 0.16)')
        : 'none',
      shadow: theme.tokens.shape.shadowLg,
    },
  }
}

export type ThemeStudioListener = () => void

/** Client-side Theme Studio Engine. */
export class ThemeStudioEngine {
  private activeThemeId: string = DEEPSEEK_CLASSIC.id
  private activeTheme: ThemeDefinition = DEEPSEEK_CLASSIC
  private customThemes: ThemeDefinition[] = []
  private autoFollowSystem = false
  private dynamicEffectsEnabled = true
  private listeners: Set<ThemeStudioListener> = new Set()
  private initialized = false
  private syncSeq = 0
  private fabricThemeProvider: FabricThemeProvider | undefined
  private resources: FabricResourceClient | undefined
  private themeTeardown: (() => void) | undefined
  private themeTokenTeardown: (() => void) | undefined
  private visibilityTeardown: (() => void) | undefined

  public constructor() {
    this.restoreFromStorage()
  }

  public init(themeProvider?: FabricThemeProvider, resources?: FabricResourceClient): void {
    if (themeProvider !== undefined) this.fabricThemeProvider = themeProvider
    if (resources !== undefined) this.resources = resources
    if (this.initialized) return
    this.initialized = true

    this.applyThemeToDom(this.activeTheme)

    if (this.fabricThemeProvider) {
      this.themeTeardown = this.fabricThemeProvider.onChange(({ dark }) => {
        if (this.autoFollowSystem) {
          const targetId = dark ? NORD_AURORA.id : SOLARIZED_LIGHT.id
          this.setActiveTheme(targetId)
        }
      })
    }

    if (typeof document !== 'undefined') {
      const onVisibilityChange = (): void => {
        if (document.hidden) {
          document.body.setAttribute('data-fabric-ambient-paused', 'true')
        } else {
          document.body.removeAttribute('data-fabric-ambient-paused')
        }
      }
      document.addEventListener('visibilitychange', onVisibilityChange)
      this.visibilityTeardown = () => document.removeEventListener('visibilitychange', onVisibilityChange)
    }

    if (this.resources !== undefined) void this.syncWithHost()
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

  public isDynamicEffectsEnabled(): boolean {
    return this.dynamicEffectsEnabled
  }

  public setDynamicEffectsEnabled(enabled: boolean): void {
    this.dynamicEffectsEnabled = enabled
    this.persistToStorage()
    this.applyThemeToDom(this.activeTheme)
    this.notify()
  }

  public setAutoFollowSystem(enabled: boolean): void {
    this.autoFollowSystem = enabled
    this.persistToStorage()
    if (enabled && this.fabricThemeProvider) {
      const isDark = this.fabricThemeProvider.isDark()
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

  public async uploadWallpaper(dataUrl: string, themeId: string): Promise<string> {
    if (this.resources === undefined) return dataUrl
    const uploaded = await this.resources.mutate(wallpaperResource, { dataUrl, themeId })
    return uploaded.url
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

    this.activeThemeId = normalized.id
    this.activeTheme = normalized
    this.applyThemeToDom(normalized)
    this.persistToStorage()
    this.notify()
    void this.pushCustomToHost(normalized)
  }

  public deleteCustomTheme(themeId: string): boolean {
    const prevLen = this.customThemes.length
    this.customThemes = this.customThemes.filter(t => t.id !== themeId)
    if (this.customThemes.length === prevLen) return false

    if (this.activeThemeId === themeId) {
      this.setActiveTheme(DEEPSEEK_CLASSIC.id)
    } else {
      this.persistToStorage()
      this.notify()
    }

    void this.pushDeleteToHost(themeId)
    return true
  }

  public dispose(): void {
    if (this.themeTeardown) {
      this.themeTeardown()
      this.themeTeardown = undefined
    }
    if (this.themeTokenTeardown !== undefined) {
      this.themeTokenTeardown()
      this.themeTokenTeardown = undefined
    }
    this.visibilityTeardown?.()
    this.visibilityTeardown = undefined
    if (typeof document !== 'undefined') {
      document.getElementById(STYLE_TAG_ID)?.remove()
      document.getElementById(WALLPAPER_CONTAINER_ID)?.remove()
      document.getElementById(NOISE_CONTAINER_ID)?.remove()
      document.documentElement.removeAttribute('data-fabric-has-wallpaper')
      document.body.removeAttribute('data-fabric-has-wallpaper')
      document.body.removeAttribute('data-fabric-theme')
      document.body.removeAttribute('data-fabric-theme-mode')
      document.body.removeAttribute('data-fabric-ambient')
      document.body.removeAttribute('data-fabric-ambient-speed')
      document.body.removeAttribute('data-fabric-ambient-paused')
    }
    this.initialized = false
  }

  public resetAll(): void {
    this.customThemes = []
    this.autoFollowSystem = false
    this.dynamicEffectsEnabled = true
    this.setActiveTheme(DEEPSEEK_CLASSIC.id)
    this.persistToStorage()
    this.notify()
    void this.pushResetToHost()
  }

  public cycleNextTheme(): ThemeDefinition {
    const all = this.getAllThemes()
    const currentIndex = all.findIndex(t => t.id === this.activeThemeId)
    const nextIndex = (currentIndex + 1) % all.length
    const nextTheme = all[nextIndex] ?? DEEPSEEK_CLASSIC
    this.setActiveTheme(nextTheme.id)
    return nextTheme
  }

  private applyThemeToDom(theme: ThemeDefinition): void {

    // Fabric is the single theme runtime. Theme Studio provides semantic values; DSH mapping stays private.
    if (this.fabricThemeProvider !== undefined) {
      this.themeTokenTeardown?.()
      this.themeTokenTeardown = this.fabricThemeProvider.provide('theme', toFabricTheme(theme), {
        priority: 100,
        scope: 'global',
      })
    }

    // Maintain theme state and the theme-specific ambient/wallpaper layers.
    if (typeof document !== 'undefined') {
      let style = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null
      if (style === null) {
        style = document.createElement('style')
        style.id = STYLE_TAG_ID
        document.head.appendChild(style)
      }
      style.textContent = generateAmbientCss(theme.material)
      document.body.setAttribute('data-fabric-theme', theme.id)
      document.body.setAttribute('data-fabric-theme-mode', theme.category)
      if (theme.category === 'light') {
        document.body.setAttribute('data-ds-light-theme', '')
        document.body.removeAttribute('data-ds-dark-theme')
      } else {
        document.body.setAttribute('data-ds-dark-theme', '')
        document.body.removeAttribute('data-ds-light-theme')
      }

      const wallpaper = theme.material?.wallpaper
      const hasWallpaper = Boolean(wallpaper?.enabled && wallpaper.url)
      if (hasWallpaper) {
        document.documentElement.setAttribute('data-fabric-has-wallpaper', 'true')
        document.body.setAttribute('data-fabric-has-wallpaper', 'true')
        let wpEl = document.getElementById(WALLPAPER_CONTAINER_ID)
        if (!wpEl) {
          wpEl = document.createElement('div')
          wpEl.id = WALLPAPER_CONTAINER_ID
          const rootEl = document.getElementById('root')
          if (rootEl && rootEl.parentNode) {
            rootEl.parentNode.insertBefore(wpEl, rootEl)
          } else {
            document.body.prepend(wpEl)
          }
        }
        wpEl.style.display = 'block'
      } else {
        document.documentElement.removeAttribute('data-fabric-has-wallpaper')
        document.body.removeAttribute('data-fabric-has-wallpaper')
        document.getElementById(WALLPAPER_CONTAINER_ID)?.remove()
      }

      const effect: BackgroundEffect =
        this.dynamicEffectsEnabled && theme.material?.backgroundEffect
          ? theme.material.backgroundEffect
          : 'none'
      const speed = theme.material?.effectSpeed ?? 'normal'
      document.body.setAttribute('data-fabric-ambient', effect)
      document.body.setAttribute('data-fabric-ambient-speed', speed)

      // Drop the v0.5.0 body-level backdrop — it sat under AppFrame's opaque fill.
      document.getElementById(BACKDROP_CONTAINER_ID)?.remove()

      let noiseEl = document.getElementById(NOISE_CONTAINER_ID)
      if (!noiseEl) {
        noiseEl = document.createElement('div')
        noiseEl.id = NOISE_CONTAINER_ID
        document.body.prepend(noiseEl)
      }
      noiseEl.style.setProperty(
        '--fabric-material-noise-opacity',
        String(theme.material?.noiseOpacity ?? 0),
      )
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
      const savedEffects = localStorage.getItem(STORAGE_KEY_EFFECT_ENABLED)
      if (savedEffects) {
        this.dynamicEffectsEnabled = savedEffects === 'true'
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
      localStorage.setItem(STORAGE_KEY_EFFECT_ENABLED, String(this.dynamicEffectsEnabled))
    } catch {
      // ignore storage access errors
    }
  }

  private async syncWithHost(): Promise<void> {
    if (this.resources === undefined) return
    const currentSeq = this.syncSeq
    try {
      const state = await this.resources.read<void, ThemeStudioStatePayload>(themeStudioStateResource, undefined)
      if (this.syncSeq !== currentSeq) return
      this.customThemes = [...state.customThemes]
      if (state.activeThemeId && (typeof localStorage === 'undefined' || !localStorage.getItem(STORAGE_KEY_ACTIVE))) {
        const match = this.getAllThemes().find(theme => theme.id === state.activeThemeId)
        if (match !== undefined) {
          this.activeThemeId = match.id
          this.activeTheme = match
          this.applyThemeToDom(match)
        }
      }
      this.notify()
    } catch (error) {
      console.error('fabric-theme-studio: state resource failed', error)
    }
  }

  private async pushActiveToHost(themeId: string): Promise<void> {
    if (this.resources === undefined) return
    await this.resources.mutate(setActiveThemeResource, { themeId })
  }

  private async pushCustomToHost(theme: ThemeDefinition): Promise<void> {
    if (this.resources === undefined) return
    await this.resources.mutate(customThemeResource, { action: 'save', theme } as never)
  }

  private async pushDeleteToHost(themeId: string): Promise<void> {
    if (this.resources === undefined) return
    await this.resources.mutate(customThemeResource, { action: 'delete', themeId } as never)
  }

  private async pushResetToHost(): Promise<void> {
    if (this.resources === undefined) return
    await this.resources.mutate(resetThemeResource, undefined)
  }
}

/** Global singleton instance of ThemeStudioEngine. */
export const themeStudioEngine = new ThemeStudioEngine()
export const themeEngine = themeStudioEngine

/** React hook for subscribing to ThemeStudio state. */
export function useThemeStudio(): {
  activeTheme: ThemeDefinition
  activeThemeId: string
  presets: readonly ThemeDefinition[]
  customThemes: readonly ThemeDefinition[]
  allThemes: readonly ThemeDefinition[]
  autoFollowSystem: boolean
  dynamicEffectsEnabled: boolean
  setActiveTheme: (themeId: string) => boolean
  applyCustomThemeDraft: (theme: ThemeDefinition) => void
  uploadWallpaper: (dataUrl: string, themeId: string) => Promise<string>
  saveCustomTheme: (theme: ThemeDefinition) => void
  deleteCustomTheme: (themeId: string) => boolean
  setAutoFollowSystem: (enabled: boolean) => void
  setDynamicEffectsEnabled: (enabled: boolean) => void
  resetAll: () => void
  cycleNextTheme: () => ThemeDefinition
} {
  const [, setTick] = useState(0)

  useEffect(() => {
    return themeStudioEngine.subscribe(() => {
      setTick(t => t + 1)
    })
  }, [])

  return {
    activeTheme: themeStudioEngine.getActiveTheme(),
    activeThemeId: themeStudioEngine.getActiveThemeId(),
    presets: themeStudioEngine.getPresets(),
    customThemes: themeStudioEngine.getCustomThemes(),
    allThemes: themeStudioEngine.getAllThemes(),
    autoFollowSystem: themeStudioEngine.isAutoFollowSystem(),
    dynamicEffectsEnabled: themeStudioEngine.isDynamicEffectsEnabled(),
    setActiveTheme: id => themeStudioEngine.setActiveTheme(id),
    applyCustomThemeDraft: t => themeStudioEngine.applyCustomThemeDraft(t),
    uploadWallpaper: (dataUrl, themeId) => themeStudioEngine.uploadWallpaper(dataUrl, themeId),
    saveCustomTheme: t => themeStudioEngine.saveCustomTheme(t),
    deleteCustomTheme: id => themeStudioEngine.deleteCustomTheme(id),
    setAutoFollowSystem: e => themeStudioEngine.setAutoFollowSystem(e),
    setDynamicEffectsEnabled: e => themeStudioEngine.setDynamicEffectsEnabled(e),
    resetAll: () => themeStudioEngine.resetAll(),
    cycleNextTheme: () => themeStudioEngine.cycleNextTheme(),
  }
}
