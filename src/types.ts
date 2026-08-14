/** Theme color scheme category. */
export type ThemeCategory = 'dark' | 'light' | 'special'

/** WCAG Contrast certification grade. */
export type ContrastGrade = 'AAA' | 'AA' | 'Pass' | 'Fail'

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
  tokens: ThemeTokens
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

export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}
