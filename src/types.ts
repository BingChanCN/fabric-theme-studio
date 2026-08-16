/** Theme color scheme category. */
export type ThemeCategory = 'dark' | 'light' | 'special'

/** WCAG Contrast certification grade. */
export type ContrastGrade = 'AAA' | 'AA' | 'Pass' | 'Fail'

/** Dynamic background effect kinds. */
export type BackgroundEffect = 'none' | 'aurora' | 'cyber-grid' | 'mesh-gradient' | 'spotlight'

/** Speed multiplier for background ambient animations. */
export type EffectSpeed = 'slow' | 'normal' | 'fast'

/** Wallpaper fit mode for background sizing. */
export type WallpaperFit = 'cover' | 'contain' | 'tile' | 'center'

/** Chat and workspace background wallpaper configuration. */
export interface ThemeWallpaper {
  /** Whether the background wallpaper is enabled. */
  enabled: boolean
  /** Image URL or local API endpoint or base64 data URI. */
  url?: string
  /** Background image sizing mode (cover, contain, tile, center). Default 'cover'. */
  fit?: WallpaperFit
  /** Dimming overlay ratio (0 ~ 1, where 0 is no overlay and 0.85 is heavily dimmed). Default 0.55. */
  dim?: number
  /** Background blur radius in pixels (0 ~ 20). Default 0. */
  blur?: number
  /** Opacity of the background image (0 ~ 1). Default 1. */
  opacity?: number
}

/** Material texture and dynamic ambient configuration. */
export interface ThemeMaterial {
  /** Enables backdrop-filter blur on overlays, modals and toolbars. */
  acrylic?: boolean
  /** Opacity of SVG noise texture (0 ~ 0.1, default 0). */
  noiseOpacity?: number
  /** Enables chamfer edge lighting with inset physical high-contrast shadows. */
  edgeHighlight?: boolean
  /** Dynamic ambient background animation effect. */
  backgroundEffect?: BackgroundEffect
  /** Dynamic ambient background animation intensity (0 ~ 1, default 0.5). */
  effectIntensity?: number
  /** Speed multiplier for background animations. */
  effectSpeed?: EffectSpeed
  /** Chat and workspace background wallpaper configuration. */
  wallpaper?: ThemeWallpaper
}

/** Tokens for core surfaces and backgrounds. */
export interface ThemeBackgroundTokens {
  bgBase: string
  bgElevated: string
  bgSubtle: string
  bgSurface: string
  bgSunken: string
}

/** Tokens for typography hierarchy. */
export interface ThemeTextTokens {
  textPrimary: string
  textSecondary: string
  textTertiary: string
  textDisabled: string
}

/** Tokens for borders and focus outlines. */
export interface ThemeBorderTokens {
  borderBase: string
  borderSubtle: string
  borderFocus: string
}

/** Tokens for brand colors and interactive surfaces. */
export interface ThemeBrandTokens {
  brandPrimary: string
  brandHover: string
  brandActive: string
  brandSurface: string
  brandText: string
}

/** Tokens for secondary accents and sparks. */
export interface ThemeAccentTokens {
  accentPrimary: string
  accentHover: string
  accentSurface: string
}

/** Tokens for semantic status indicators. */
export interface ThemeStatusTokens {
  success: string
  warning: string
  error: string
  info: string
}

/** Tokens for shape and elevation. */
export interface ThemeShapeTokens {
  radiusSm: string
  radiusMd: string
  radiusLg: string
  shadowSm: string
  shadowMd: string
  shadowLg: string
}

/** Complete token definition for a theme. */
export interface ThemeTokens {
  background: ThemeBackgroundTokens
  text: ThemeTextTokens
  border: ThemeBorderTokens
  brand: ThemeBrandTokens
  accent: ThemeAccentTokens
  status: ThemeStatusTokens
  shape: ThemeShapeTokens
}

/** Metadata and definition of a theme. */
export interface ThemeDefinition {
  id: string
  name: string
  category: ThemeCategory
  description: string
  author?: string
  isBuiltin?: boolean
  contrastRating?: ContrastGrade
  material?: ThemeMaterial
  tokens: ThemeTokens
}

/** Serializable user custom theme structure. */
export interface CustomTheme {
  id: string
  name: string
  author?: string
  description?: string
  tags?: string[]
  isDark: boolean
  material?: ThemeMaterial
  createdAt?: string
  updatedAt?: string
  tokens: Record<string, string>
}

/** Host API payloads for theme studio. */
export interface ThemeStudioStatePayload {
  activeThemeId: string
  activeTheme: ThemeDefinition
  presets: readonly ThemeDefinition[]
  customThemes: readonly ThemeDefinition[]
  version: string
}

export interface SetActiveThemeRequest {
  themeId: string
}

export interface SaveCustomThemeRequest {
  theme: ThemeDefinition
}

export interface DeleteCustomThemeRequest {
  themeId: string
}

export interface UploadWallpaperRequest {
  dataUrl: string
  filename?: string
  themeId?: string
}

export interface UploadWallpaperResponse {
  url: string
  filename: string
}

export interface LegacyThemeStudioMigrationRequest {
  activeThemeId?: string
  customThemes: readonly ThemeDefinition[]
}

export interface LegacyThemeStudioMigrationResponse {
  migrated: boolean
  wallpapersMigrated: number
}

export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}
