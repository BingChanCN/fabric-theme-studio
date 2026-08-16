import { defineCodec, defineResource, voidCodec } from '@dsh-do/fabric/sdk'
import type {
  DeleteCustomThemeRequest, LegacyThemeStudioMigrationRequest, LegacyThemeStudioMigrationResponse,
  SaveCustomThemeRequest, SetActiveThemeRequest,
  ThemeDefinition, ThemeStudioStatePayload, UploadWallpaperRequest, UploadWallpaperResponse,
} from './types.ts'

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value as Record<string, unknown>
}

const themeCodec = defineCodec<ThemeDefinition>(value => {
  const item = record(value, 'theme')
  if (typeof item.id !== 'string' || item.id.trim() === '') throw new Error('theme.id must be a non-empty string')
  if (typeof item.name !== 'string') throw new Error('theme.name must be a string')
  if (typeof item.tokens !== 'object' || item.tokens === null) throw new Error('theme.tokens must be an object')
  return value as ThemeDefinition
})

const stateCodec = defineCodec<ThemeStudioStatePayload>(value => {
  const item = record(value, 'theme studio state')
  if (typeof item.activeThemeId !== 'string' || !Array.isArray(item.presets) || !Array.isArray(item.customThemes)) {
    throw new Error('theme studio state has an invalid shape')
  }
  themeCodec.parse(item.activeTheme)
  for (const theme of item.presets) themeCodec.parse(theme)
  for (const theme of item.customThemes) themeCodec.parse(theme)
  return value as ThemeStudioStatePayload
})

const activeRequestCodec = defineCodec<SetActiveThemeRequest>(value => {
  const item = record(value, 'active theme request')
  if (typeof item.themeId !== 'string' || item.themeId.trim() === '') throw new Error('themeId must be a non-empty string')
  return { themeId: item.themeId }
})

const activeResponseCodec = defineCodec<{ activeThemeId: string; activeTheme: ThemeDefinition }>(value => {
  const item = record(value, 'active theme response')
  if (typeof item.activeThemeId !== 'string') throw new Error('activeThemeId must be a string')
  themeCodec.parse(item.activeTheme)
  return value as { activeThemeId: string; activeTheme: ThemeDefinition }
})

export type CustomThemeResourceRequest =
  | (SaveCustomThemeRequest & { readonly action: 'save' })
  | (DeleteCustomThemeRequest & { readonly action: 'delete' })

const customRequestCodec = defineCodec<CustomThemeResourceRequest>(value => {
  const item = record(value, 'custom theme request')
  if (item.action === 'delete') {
    if (typeof item.themeId !== 'string' || item.themeId.trim() === '') throw new Error('themeId must be a non-empty string')
    return { action: 'delete', themeId: item.themeId } as DeleteCustomThemeRequest & { action: 'delete' }
  }
  if (item.action === 'save') {
    themeCodec.parse(item.theme)
    return { action: 'save', theme: item.theme } as SaveCustomThemeRequest & { action: 'save' }
  }
  throw new Error('custom theme request action must be save or delete')
})

const customResponseCodec = defineCodec<{
  saved?: boolean
  deleted?: boolean
  customThemes: readonly ThemeDefinition[]
  activeThemeId: string
}>(value => {
  const item = record(value, 'custom theme response')
  if (!Array.isArray(item.customThemes) || typeof item.activeThemeId !== 'string') throw new Error('invalid custom theme response')
  for (const theme of item.customThemes) themeCodec.parse(theme)
  return value as {
    saved?: boolean
    deleted?: boolean
    customThemes: readonly ThemeDefinition[]
    activeThemeId: string
  }
})

const wallpaperRequestCodec = defineCodec<UploadWallpaperRequest>(value => {
  const item = record(value, 'wallpaper request')
  if (typeof item.dataUrl !== 'string' || !item.dataUrl.startsWith('data:image/')) throw new Error('wallpaper dataUrl must be an image data URL')
  return value as UploadWallpaperRequest
})

const wallpaperResponseCodec = defineCodec<UploadWallpaperResponse>(value => {
  const item = record(value, 'wallpaper response')
  if (typeof item.url !== 'string' || typeof item.filename !== 'string') throw new Error('invalid wallpaper response')
  return value as UploadWallpaperResponse
})

const legacyMigrationRequestCodec = defineCodec<LegacyThemeStudioMigrationRequest>(value => {
  const item = record(value, 'legacy theme migration request')
  if (item.activeThemeId !== undefined && typeof item.activeThemeId !== 'string') throw new Error('legacy activeThemeId must be a string')
  if (!Array.isArray(item.customThemes)) throw new Error('legacy customThemes must be an array')
  for (const theme of item.customThemes) themeCodec.parse(theme)
  return {
    ...(typeof item.activeThemeId === 'string' ? { activeThemeId: item.activeThemeId } : {}),
    customThemes: item.customThemes as ThemeDefinition[],
  }
})

const legacyMigrationResponseCodec = defineCodec<LegacyThemeStudioMigrationResponse>(value => {
  const item = record(value, 'legacy theme migration response')
  if (typeof item.migrated !== 'boolean' || typeof item.wallpapersMigrated !== 'number') {
    throw new Error('invalid legacy theme migration response')
  }
  return value as LegacyThemeStudioMigrationResponse
})

export const themeStudioStateResource = defineResource<void, ThemeStudioStatePayload>({
  owner: '@dsh-do/fabric-theme-studio', id: 'state', version: '1', scope: 'profile', request: voidCodec, response: stateCodec,
})

export const activeThemeResource = defineResource<void, { activeThemeId: string; activeTheme: ThemeDefinition }>({
  owner: '@dsh-do/fabric-theme-studio', id: 'active', version: '1', scope: 'profile', request: voidCodec, response: activeResponseCodec,
})

export const setActiveThemeResource = defineResource<SetActiveThemeRequest, { activeThemeId: string; activeTheme: ThemeDefinition }>({
  owner: '@dsh-do/fabric-theme-studio', id: 'active-set', version: '1', scope: 'profile', request: activeRequestCodec, response: activeResponseCodec,
})

export const customThemeResource = defineResource<CustomThemeResourceRequest, {
  saved?: boolean
  deleted?: boolean
  customThemes: readonly ThemeDefinition[]
  activeThemeId: string
}>({ owner: '@dsh-do/fabric-theme-studio', id: 'custom', version: '1', scope: 'profile', request: customRequestCodec, response: customResponseCodec })

export const resetThemeResource = defineResource<void, {
  reset: boolean
  activeThemeId: string
  activeTheme: ThemeDefinition
}>({ owner: '@dsh-do/fabric-theme-studio', id: 'reset', version: '1', scope: 'profile', request: voidCodec, response: defineCodec(value => {
  const item = record(value, 'reset response')
  if (item.reset !== true || typeof item.activeThemeId !== 'string') throw new Error('invalid reset response')
  themeCodec.parse(item.activeTheme)
  return value as { reset: boolean; activeThemeId: string; activeTheme: ThemeDefinition }
}) })

export const wallpaperResource = defineResource<UploadWallpaperRequest, UploadWallpaperResponse>({
  owner: '@dsh-do/fabric-theme-studio', id: 'wallpaper', version: '1', scope: 'profile', request: wallpaperRequestCodec, response: wallpaperResponseCodec,
})

export const legacyThemeStudioMigrationResource = defineResource<LegacyThemeStudioMigrationRequest, LegacyThemeStudioMigrationResponse>({
  owner: '@dsh-do/fabric-theme-studio', id: 'migrate-static-data', version: '1', scope: 'profile',
  request: legacyMigrationRequestCodec, response: legacyMigrationResponseCodec,
})