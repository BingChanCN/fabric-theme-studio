import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, extname, join } from 'node:path'
import {
  defineCodec, defineDocument, defineHostPlugin,
  type FabricDocumentHandle, type FabricPluginBlobHost,
} from '@dsh-do/fabric/host'
import type {
  LegacyThemeStudioMigrationRequest, LegacyThemeStudioMigrationResponse, SetActiveThemeRequest,
  ThemeDefinition, ThemeStudioStatePayload, UploadWallpaperRequest, UploadWallpaperResponse,
} from './types.ts'
import {
  activeThemeResource, customThemeResource, legacyThemeStudioMigrationResource,
  resetThemeResource, setActiveThemeResource, themeStudioStateResource, wallpaperResource,
} from './resources.ts'
import type { CustomThemeResourceRequest } from './resources.ts'
import { BUILTIN_PRESETS, DEEPSEEK_CLASSIC } from './presets.ts'

export const PACKAGE_VERSION = '1.0.0'

export interface ThemeStudioDocument {
  readonly activeThemeId: string
  readonly customThemes: readonly ThemeDefinition[]
  readonly migratedFromStatic: boolean
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`)
  return value as Record<string, unknown>
}

function parseTheme(value: unknown): ThemeDefinition {
  const item = record(value, 'theme')
  if (typeof item.id !== 'string' || item.id.trim() === '') throw new Error('theme.id must be a non-empty string')
  if (typeof item.name !== 'string' || item.name.trim() === '') throw new Error('theme.name must be a non-empty string')
  if (item.tokens === null || typeof item.tokens !== 'object' || Array.isArray(item.tokens)) throw new Error('theme.tokens must be an object')
  return value as ThemeDefinition
}

const themeStudioDocumentCodec = defineCodec<ThemeStudioDocument>(value => {
  const item = record(value, 'theme studio document')
  if (typeof item.activeThemeId !== 'string' || item.activeThemeId.trim() === '') {
    throw new Error('theme studio activeThemeId must be a non-empty string')
  }
  if (!Array.isArray(item.customThemes)) throw new Error('theme studio customThemes must be an array')
  const customThemes = item.customThemes.map(parseTheme)
  const ids = new Set<string>()
  for (const theme of customThemes) {
    if (ids.has(theme.id)) throw new Error(`duplicate custom theme "${theme.id}"`)
    ids.add(theme.id)
  }
  if (typeof item.migratedFromStatic !== 'boolean') throw new Error('theme studio migratedFromStatic must be a boolean')
  return { activeThemeId: item.activeThemeId, customThemes, migratedFromStatic: item.migratedFromStatic }
})

export const themeStudioDocument = defineDocument<ThemeStudioDocument>({
  id: 'themes',
  version: '1',
  codec: themeStudioDocumentCodec,
  initial: { activeThemeId: DEEPSEEK_CLASSIC.id, customThemes: [], migratedFromStatic: false },
})

const LEGACY_WALLPAPER_PREFIX = '/fabric/asset/fabric-theme-studio/wallpaper/'
const WALLPAPER_MIME: Readonly<Record<string, string>> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
}

export function getLegacyWallpaperStorageDir(): string {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'fabric-theme-studio', 'wallpapers')
}

async function migrateLegacyWallpaper(theme: ThemeDefinition, blobs: FabricPluginBlobHost): Promise<{ theme: ThemeDefinition; migrated: boolean }> {
  const wallpaper = theme.material?.wallpaper
  if (wallpaper?.url === undefined || !wallpaper.url.startsWith(LEGACY_WALLPAPER_PREFIX)) return { theme, migrated: false }
  const encodedFilename = wallpaper.url.slice(LEGACY_WALLPAPER_PREFIX.length)
  let filename: string
  try { filename = decodeURIComponent(encodedFilename) } catch { return { theme, migrated: false } }
  if (filename === '' || filename !== basename(filename) || filename === '.' || filename === '..') return { theme, migrated: false }
  try {
    const body = await readFile(join(getLegacyWallpaperStorageDir(), filename))
    const ref = await blobs.put({ contentType: WALLPAPER_MIME[extname(filename).toLowerCase()] ?? 'application/octet-stream', body })
    return {
      migrated: true,
      theme: {
        ...theme,
        material: { ...theme.material, wallpaper: { ...wallpaper, url: blobs.url(ref) } },
      },
    }
  } catch {
    return { theme, migrated: false }
  }
}

export class ThemeHostStore {
  private writes: Promise<void> = Promise.resolve()

  constructor(private readonly document: FabricDocumentHandle<ThemeStudioDocument>) {}

  private serialize<T>(task: () => Promise<T>): Promise<T> {
    const result = this.writes.then(task, task)
    this.writes = result.then(() => {}, () => {})
    return result
  }

  private async state(): Promise<ThemeStudioDocument> {
    return (await this.document.read()).value
  }

  private findTheme(state: ThemeStudioDocument, id: string): ThemeDefinition | undefined {
    return state.customThemes.find(theme => theme.id === id) ?? BUILTIN_PRESETS.find(theme => theme.id === id)
  }

  async getStatePayload(): Promise<ThemeStudioStatePayload> {
    const state = await this.state()
    return {
      activeThemeId: state.activeThemeId,
      activeTheme: this.findTheme(state, state.activeThemeId) ?? DEEPSEEK_CLASSIC,
      presets: BUILTIN_PRESETS,
      customThemes: state.customThemes,
      version: PACKAGE_VERSION,
    }
  }

  async setActiveThemeId(id: string): Promise<{ activeThemeId: string; activeTheme: ThemeDefinition }> {
    return this.serialize(async () => {
      const next = await this.document.update(current => {
        if (this.findTheme(current, id) === undefined) throw new Error('theme-not-found')
        return { ...current, activeThemeId: id }
      })
      return {
        activeThemeId: next.value.activeThemeId,
        activeTheme: this.findTheme(next.value, next.value.activeThemeId) ?? DEEPSEEK_CLASSIC,
      }
    })
  }

  async saveCustomTheme(theme: ThemeDefinition): Promise<ThemeStudioDocument> {
    const parsed = parseTheme(theme)
    return this.serialize(async () => (await this.document.update(current => ({
      ...current,
      customThemes: [...current.customThemes.filter(item => item.id !== parsed.id), { ...parsed, isBuiltin: false }],
    }))).value)
  }

  async deleteCustomTheme(id: string): Promise<{ readonly deleted: boolean; readonly state: ThemeStudioDocument }> {
    return this.serialize(async () => {
      let deleted = false
      const next = await this.document.update(current => {
        const customThemes = current.customThemes.filter(theme => theme.id !== id)
        deleted = customThemes.length !== current.customThemes.length
        return {
          ...current,
          activeThemeId: deleted && current.activeThemeId === id ? DEEPSEEK_CLASSIC.id : current.activeThemeId,
          customThemes,
        }
      })
      return { deleted, state: next.value }
    })
  }

  async reset(): Promise<{ activeThemeId: string; activeTheme: ThemeDefinition }> {
    return this.serialize(async () => {
      const next = await this.document.update(current => ({ ...current, activeThemeId: DEEPSEEK_CLASSIC.id }))
      return { activeThemeId: next.value.activeThemeId, activeTheme: DEEPSEEK_CLASSIC }
    })
  }

  async migrateStaticData(
    request: LegacyThemeStudioMigrationRequest,
    blobs: FabricPluginBlobHost,
  ): Promise<LegacyThemeStudioMigrationResponse> {
    return this.serialize(async () => {
      const current = await this.state()
      if (current.migratedFromStatic) return { migrated: false, wallpapersMigrated: 0 }
      if (current.activeThemeId !== DEEPSEEK_CLASSIC.id || current.customThemes.length > 0) {
        await this.document.update(value => ({ ...value, migratedFromStatic: true }))
        return { migrated: false, wallpapersMigrated: 0 }
      }

      let wallpapersMigrated = 0
      const customThemes: ThemeDefinition[] = []
      for (const candidate of request.customThemes) {
        const migrated = await migrateLegacyWallpaper(parseTheme(candidate), blobs)
        if (migrated.migrated) wallpapersMigrated += 1
        customThemes.push({ ...migrated.theme, isBuiltin: false })
      }
      const requestedActive = request.activeThemeId?.trim()
      const activeThemeId = requestedActive !== undefined
        && (customThemes.some(theme => theme.id === requestedActive) || BUILTIN_PRESETS.some(theme => theme.id === requestedActive))
        ? requestedActive
        : DEEPSEEK_CLASSIC.id
      await this.document.update(() => ({ activeThemeId, customThemes, migratedFromStatic: true }))
      return { migrated: customThemes.length > 0 || activeThemeId !== DEEPSEEK_CLASSIC.id, wallpapersMigrated }
    })
  }
}

function decodeWallpaper(request: UploadWallpaperRequest): { readonly contentType: string; readonly body: Uint8Array; readonly filename: string } {
  const match = request.dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/u)
  if (match === null || match[1] === undefined || match[2] === undefined) throw new Error('malformed-base64-image')
  const body = Buffer.from(match[2], 'base64')
  if (body.byteLength > 15 * 1024 * 1024) throw new Error('image-too-large')
  const filename = request.filename?.trim() || `${request.themeId?.trim() || 'wallpaper'}.${match[1].split('/')[1] ?? 'png'}`
  return { contentType: match[1], body, filename }
}

const definition = defineHostPlugin({
  descriptor: {
    name: 'Fabric Theme Studio',
    description: 'Theme provider and personalization resources for Fabric.',
  },
  async setup({ resources, documents, blobs }) {
    const store = new ThemeHostStore(await documents.open(themeStudioDocument))
    resources.provide(themeStudioStateResource, {
      query: () => store.getStatePayload(),
    })
    resources.provide(activeThemeResource, {
      query: async () => {
        const state = await store.getStatePayload()
        return { activeThemeId: state.activeThemeId, activeTheme: state.activeTheme }
      },
    })
    resources.provide(setActiveThemeResource, {
      mutate: (request: SetActiveThemeRequest) => store.setActiveThemeId(request.themeId.trim()),
    })
    resources.provide(customThemeResource, {
      mutate: async (action: CustomThemeResourceRequest) => {
        if (action.action === 'save') {
          const state = await store.saveCustomTheme(action.theme)
          return { saved: true, customThemes: state.customThemes, activeThemeId: state.activeThemeId }
        }
        const result = await store.deleteCustomTheme(action.themeId)
        return {
          deleted: result.deleted,
          customThemes: result.state.customThemes,
          activeThemeId: result.state.activeThemeId,
        }
      },
    })
    resources.provide(resetThemeResource, {
      mutate: async () => ({ reset: true, ...await store.reset() }),
    })
    resources.provide(wallpaperResource, {
      mutate: async request => {
        const wallpaper = decodeWallpaper(request)
        const ref = await blobs.put({ contentType: wallpaper.contentType, body: wallpaper.body })
        return { url: blobs.url(ref), filename: wallpaper.filename } satisfies UploadWallpaperResponse
      },
    })
    resources.provide(legacyThemeStudioMigrationResource, {
      mutate: request => store.migrateStaticData(request, blobs),
    })
  },
})

export default definition
