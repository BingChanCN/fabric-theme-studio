import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  assetUrl, defineHostPlugin, mountHostPlugin,
} from '@dsh-do/fabric'
import type {
  SetActiveThemeRequest,
  ThemeDefinition, ThemeStudioStatePayload, UploadWallpaperRequest, UploadWallpaperResponse,
} from './types.ts'
import {
  activeThemeResource, customThemeResource, resetThemeResource, setActiveThemeResource,
  themeStudioStateResource, wallpaperResource,
} from './resources.ts'
import type { CustomThemeResourceRequest } from './resources.ts'
import { BUILTIN_PRESETS, DEEPSEEK_CLASSIC } from './presets.ts'

export const PACKAGE_VERSION = '0.8.0'

export function getWallpaperStorageDir(): string {
  const baseDir = process.env.DSH_HOME ?? path.join(os.homedir(), '.dsh')
  const dir = path.join(baseDir, 'fabric-theme-studio', 'wallpapers')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

export class ThemeHostStore {
  private activeId = DEEPSEEK_CLASSIC.id
  private readonly customThemesMap = new Map<string, ThemeDefinition>()

  getActiveThemeId(): string { return this.activeId }

  setActiveThemeId(id: string): boolean {
    if (BUILTIN_PRESETS.some(theme => theme.id === id) || this.customThemesMap.has(id)) {
      this.activeId = id
      return true
    }
    return false
  }

  getActiveTheme(): ThemeDefinition {
    return this.customThemesMap.get(this.activeId)
      ?? BUILTIN_PRESETS.find(theme => theme.id === this.activeId)
      ?? DEEPSEEK_CLASSIC
  }

  getCustomThemes(): ThemeDefinition[] { return [...this.customThemesMap.values()] }

  saveCustomTheme(theme: ThemeDefinition): void {
    this.customThemesMap.set(theme.id, { ...theme, isBuiltin: false })
  }

  deleteCustomTheme(id: string): boolean {
    const deleted = this.customThemesMap.delete(id)
    if (deleted && this.activeId === id) this.activeId = DEEPSEEK_CLASSIC.id
    return deleted
  }

  reset(): void { this.activeId = DEEPSEEK_CLASSIC.id }

  getStatePayload(): ThemeStudioStatePayload {
    return {
      activeThemeId: this.activeId,
      activeTheme: this.getActiveTheme(),
      presets: BUILTIN_PRESETS,
      customThemes: this.getCustomThemes(),
      version: PACKAGE_VERSION,
    }
  }
}

function uploadWallpaper(request: UploadWallpaperRequest): UploadWallpaperResponse {
  const match = request.dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/)
  if (match === null || match[1] === undefined || match[2] === undefined) throw new Error('malformed-base64-image')
  const mimeType = match[1]
  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.byteLength > 15 * 1024 * 1024) throw new Error('image-too-large')
  let ext = '.png'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg'
  else if (mimeType.includes('webp')) ext = '.webp'
  else if (mimeType.includes('gif')) ext = '.gif'
  else if (mimeType.includes('svg')) ext = '.svg'
  const prefix = request.themeId?.replace(/[^a-zA-Z0-9_-]/gu, '') || 'wp'
  const filename = `${prefix}-${crypto.randomBytes(6).toString('hex')}${ext}`
  fs.writeFileSync(path.join(getWallpaperStorageDir(), filename), buffer)
  return { url: assetUrl('fabric-theme-studio', 'wallpaper', filename), filename }
}

const definition = defineHostPlugin({
  descriptor: {
    name: 'Fabric Theme Studio',
    description: 'Theme provider and personalization resources for Fabric.',
  },
  setup({ resources }) {
    const store = new ThemeHostStore()
    resources.provide(themeStudioStateResource, {
      query: () => store.getStatePayload(),
    })
    resources.provide(activeThemeResource, {
      query: () => ({ activeThemeId: store.getActiveThemeId(), activeTheme: store.getActiveTheme() }),
    })
    resources.provide(setActiveThemeResource, {
      mutate: (request: SetActiveThemeRequest) => {
        if (!store.setActiveThemeId(request.themeId.trim())) throw new Error('theme-not-found')
        return { activeThemeId: store.getActiveThemeId(), activeTheme: store.getActiveTheme() }
      },
    })
    resources.provide(customThemeResource, {
      mutate: (action: CustomThemeResourceRequest) => {
        if (action.action === 'save') {
          store.saveCustomTheme(action.theme)
          return { saved: true, customThemes: store.getCustomThemes(), activeThemeId: store.getActiveThemeId() }
        }
        const deleted = store.deleteCustomTheme(action.themeId)
        return { deleted, customThemes: store.getCustomThemes(), activeThemeId: store.getActiveThemeId() }
      },
    })
    resources.provide(resetThemeResource, {
      mutate: () => {
        store.reset()
        return { reset: true, activeThemeId: store.getActiveThemeId(), activeTheme: store.getActiveTheme() }
      },
    })
    resources.provide(wallpaperResource, {
      mutate: uploadWallpaper,
    })
    resources.assets.provide('wallpaper', async context => {
      if (context.method !== 'GET' && context.method !== 'HEAD') throw new Error('method-not-allowed')
      const filename = path.basename(context.path)
      if (filename !== context.path || filename === '.' || filename.includes('..')) throw new Error('invalid-filename')
      const filePath = path.join(getWallpaperStorageDir(), filename)
      if (!fs.existsSync(filePath)) return undefined
      const extension = path.extname(filename).toLowerCase()
      return {
        contentType: MIME_TYPES[extension] ?? 'application/octet-stream',
        body: await fs.promises.readFile(filePath),
        cacheControl: 'public, max-age=31536000, immutable',
      }
    })
  },
})

export const { inject, apply } = mountHostPlugin(
  '@dsh-do/fabric-theme-studio',
  PACKAGE_VERSION,
  definition,
)