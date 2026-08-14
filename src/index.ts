import type { IncomingMessage, ServerResponse } from 'node:http'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import * as crypto from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { BUILTIN_PRESETS, DEEPSEEK_CLASSIC } from './presets.ts'
import type {
  DeleteCustomThemeRequest,
  SaveCustomThemeRequest,
  SetActiveThemeRequest,
  ThemeDefinition,
  ThemeStudioStatePayload,
  UploadWallpaperRequest,
} from './types.ts'

function writeJson(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type, x-session-id',
  })
  res.end(JSON.stringify(value))
}

async function readJson<T>(req: IncomingMessage): Promise<T | undefined> {
  let body = ''
  for await (const chunk of req) body += chunk.toString()
  if (body.trim() === '') return undefined
  return JSON.parse(body) as T
}

export function getWallpaperStorageDir(): string {
  const baseDir = process.env.DSH_HOME ?? path.join(os.homedir(), '.dsh')
  const dir = path.join(baseDir, 'fabric-theme-studio', 'wallpapers')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
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

export interface ThemeStoreState {
  activeThemeId: string
  customThemes: Map<string, ThemeDefinition>
}

/** Theme state repository for the host runtime. */
export class ThemeHostStore {
  private activeId: string = DEEPSEEK_CLASSIC.id
  private customThemesMap: Map<string, ThemeDefinition> = new Map()

  public getActiveThemeId(): string {
    return this.activeId
  }

  public setActiveThemeId(id: string): boolean {
    if (BUILTIN_PRESETS.some(p => p.id === id) || this.customThemesMap.has(id)) {
      this.activeId = id
      return true
    }
    return false
  }

  public getActiveTheme(): ThemeDefinition {
    const custom = this.customThemesMap.get(this.activeId)
    if (custom !== undefined) return custom
    const builtin = BUILTIN_PRESETS.find(p => p.id === this.activeId)
    return builtin ?? DEEPSEEK_CLASSIC
  }

  public getCustomThemes(): ThemeDefinition[] {
    return Array.from(this.customThemesMap.values())
  }

  public saveCustomTheme(theme: ThemeDefinition): void {
    const cloned: ThemeDefinition = {
      ...theme,
      isBuiltin: false,
    }
    this.customThemesMap.set(theme.id, cloned)
  }

  public deleteCustomTheme(id: string): boolean {
    const deleted = this.customThemesMap.delete(id)
    if (deleted && this.activeId === id) {
      this.activeId = DEEPSEEK_CLASSIC.id
    }
    return deleted
  }

  public reset(): void {
    this.activeId = DEEPSEEK_CLASSIC.id
  }

  public getStatePayload(): ThemeStudioStatePayload {
    return {
      activeThemeId: this.activeId,
      activeTheme: this.getActiveTheme(),
      presets: BUILTIN_PRESETS,
      customThemes: this.getCustomThemes(),
      version: '0.6.2',
    }
  }
}

/** Host extension for DeepSeek Harness: provides WebServer endpoints for theme management and wallpaper hosting. */
export function apply(ctx: Context): void {
  const store = new ThemeHostStore()

  ctx.inject(['webServer'], webCtx => {
    webCtx.effect(() => {
      const stopState = webCtx.webServer.register({
        kind: 'exact',
        path: '/api/theme-studio/state',
        handler: (req, res) => {
          if (req.method === 'OPTIONS') {
            writeJson(res, 204, null)
            return
          }
          if (req.method !== 'GET') {
            writeJson(res, 405, { ok: false, error: 'method-not-allowed' })
            return
          }
          writeJson(res, 200, { ok: true, data: store.getStatePayload() })
        },
      })

      const stopActive = webCtx.webServer.register({
        kind: 'exact',
        path: '/api/theme-studio/active',
        handler: async (req, res) => {
          if (req.method === 'OPTIONS') {
            writeJson(res, 204, null)
            return
          }
          if (req.method === 'GET') {
            writeJson(res, 200, {
              ok: true,
              data: {
                activeThemeId: store.getActiveThemeId(),
                activeTheme: store.getActiveTheme(),
              },
            })
            return
          }
          if (req.method === 'POST') {
            try {
              const body = await readJson<SetActiveThemeRequest>(req)
              if (body === undefined || typeof body.themeId !== 'string' || body.themeId.trim() === '') {
                writeJson(res, 400, { ok: false, error: 'invalid-theme-id' })
                return
              }
              const success = store.setActiveThemeId(body.themeId.trim())
              if (!success) {
                writeJson(res, 404, { ok: false, error: 'theme-not-found' })
                return
              }
              writeJson(res, 200, {
                ok: true,
                data: {
                  activeThemeId: store.getActiveThemeId(),
                  activeTheme: store.getActiveTheme(),
                },
              })
            } catch {
              writeJson(res, 400, { ok: false, error: 'invalid-json' })
            }
            return
          }
          writeJson(res, 405, { ok: false, error: 'method-not-allowed' })
        },
      })

      const stopCustom = webCtx.webServer.register({
        kind: 'exact',
        path: '/api/theme-studio/custom',
        handler: async (req, res) => {
          if (req.method === 'OPTIONS') {
            writeJson(res, 204, null)
            return
          }
          if (req.method === 'POST') {
            try {
              const body = await readJson<SaveCustomThemeRequest>(req)
              if (body === undefined || typeof body.theme !== 'object' || body.theme === null) {
                writeJson(res, 400, { ok: false, error: 'missing-theme-payload' })
                return
              }
              const theme = body.theme
              if (typeof theme.id !== 'string' || theme.id.trim() === '' || typeof theme.name !== 'string') {
                writeJson(res, 400, { ok: false, error: 'invalid-theme-metadata' })
                return
              }
              store.saveCustomTheme(theme)
              writeJson(res, 200, {
                ok: true,
                data: {
                  saved: true,
                  customThemes: store.getCustomThemes(),
                },
              })
            } catch {
              writeJson(res, 400, { ok: false, error: 'invalid-json' })
            }
            return
          }
          if (req.method === 'DELETE') {
            try {
              const url = new URL(req.url ?? '/api/theme-studio/custom', `http://${req.headers.host ?? 'localhost'}`)
              let themeId = url.searchParams.get('themeId')
              if (!themeId) {
                const body = await readJson<DeleteCustomThemeRequest>(req)
                themeId = body?.themeId ?? null
              }
              if (!themeId) {
                writeJson(res, 400, { ok: false, error: 'missing-theme-id' })
                return
              }
              const deleted = store.deleteCustomTheme(themeId)
              writeJson(res, 200, {
                ok: true,
                data: {
                  deleted,
                  customThemes: store.getCustomThemes(),
                  activeThemeId: store.getActiveThemeId(),
                },
              })
            } catch {
              writeJson(res, 400, { ok: false, error: 'invalid-delete-request' })
            }
            return
          }
          writeJson(res, 405, { ok: false, error: 'method-not-allowed' })
        },
      })

      const stopReset = webCtx.webServer.register({
        kind: 'exact',
        path: '/api/theme-studio/reset',
        handler: (req, res) => {
          if (req.method === 'OPTIONS') {
            writeJson(res, 204, null)
            return
          }
          if (req.method !== 'POST') {
            writeJson(res, 405, { ok: false, error: 'method-not-allowed' })
            return
          }
          store.reset()
          writeJson(res, 200, {
            ok: true,
            data: {
              reset: true,
              activeThemeId: store.getActiveThemeId(),
              activeTheme: store.getActiveTheme(),
            },
          })
        },
      })

      // Wallpaper upload endpoint
      const stopWallpaperUpload = webCtx.webServer.register({
        kind: 'exact',
        path: '/api/theme-studio/wallpaper',
        handler: async (req, res) => {
          if (req.method === 'OPTIONS') {
            writeJson(res, 204, null)
            return
          }
          if (req.method === 'POST') {
            try {
              const body = await readJson<UploadWallpaperRequest>(req)
              if (!body || typeof body.dataUrl !== 'string' || !body.dataUrl.startsWith('data:image/')) {
                writeJson(res, 400, { ok: false, error: 'invalid-data-url' })
                return
              }

              // Extract mime and base64 payload
              const match = body.dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/)
              if (!match || !match[1] || !match[2]) {
                writeJson(res, 400, { ok: false, error: 'malformed-base64-image' })
                return
              }

              const mimeType = match[1]
              const base64Data = match[2]
              const buffer = Buffer.from(base64Data, 'base64')

              // 15MB file size limit
              if (buffer.length > 15 * 1024 * 1024) {
                writeJson(res, 413, { ok: false, error: 'image-too-large' })
                return
              }

              let ext = '.png'
              if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg'
              else if (mimeType.includes('webp')) ext = '.webp'
              else if (mimeType.includes('gif')) ext = '.gif'
              else if (mimeType.includes('svg')) ext = '.svg'

              const prefix = body.themeId ? body.themeId.replace(/[^a-zA-Z0-9_-]/g, '') : 'wp'
              const randomHex = crypto.randomBytes(6).toString('hex')
              const filename = `${prefix}-${randomHex}${ext}`

              const wallpaperDir = getWallpaperStorageDir()
              const filePath = path.join(wallpaperDir, filename)
              fs.writeFileSync(filePath, buffer)

              const publicUrl = `/api/theme-studio/wallpaper/${filename}`
              writeJson(res, 200, {
                ok: true,
                data: {
                  url: publicUrl,
                  filename,
                },
              })
            } catch (err) {
              writeJson(res, 500, { ok: false, error: String(err) })
            }
            return
          }
          writeJson(res, 405, { ok: false, error: 'method-not-allowed' })
        },
      })

      // Wallpaper serve endpoint (prefix matching for /api/theme-studio/wallpaper/:filename)
      const stopWallpaperServe = webCtx.webServer.register({
        kind: 'prefix',
        path: '/api/theme-studio/wallpaper',
        handler: (req, res) => {
          if (req.method === 'OPTIONS') {
            writeJson(res, 204, null)
            return
          }
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            writeJson(res, 405, { ok: false, error: 'method-not-allowed' })
            return
          }

          try {
            const urlPath = req.url ?? ''
            const prefix = '/api/theme-studio/wallpaper/'
            const prefixIdx = urlPath.indexOf(prefix)
            const rawFilename = prefixIdx !== -1 ? urlPath.slice(prefixIdx + prefix.length).split('?')[0] : ''
            const filename = path.basename(decodeURIComponent(rawFilename ?? ''))

            if (!filename || filename === '.' || filename.includes('..')) {
              writeJson(res, 400, { ok: false, error: 'invalid-filename' })
              return
            }

            const wallpaperDir = getWallpaperStorageDir()
            const filePath = path.join(wallpaperDir, filename)

            if (!fs.existsSync(filePath)) {
              writeJson(res, 404, { ok: false, error: 'wallpaper-not-found' })
              return
            }

            const ext = path.extname(filename).toLowerCase()
            const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'
            const stat = fs.statSync(filePath)

            res.writeHead(200, {
              'content-type': contentType,
              'content-length': stat.size,
              'cache-control': 'public, max-age=31536000, immutable',
              'access-control-allow-origin': '*',
            })

            if (req.method === 'HEAD') {
              res.end()
              return
            }

            const stream = fs.createReadStream(filePath)
            stream.pipe(res)
          } catch (err) {
            writeJson(res, 500, { ok: false, error: String(err) })
          }
        },
      })

      return () => {
        stopWallpaperServe()
        stopWallpaperUpload()
        stopReset()
        stopCustom()
        stopActive()
        stopState()
      }
    }, 'fabric-theme-studio: web routes')
  })
}
