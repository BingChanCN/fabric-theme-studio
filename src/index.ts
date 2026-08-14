import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { BUILTIN_PRESETS, DEEPSEEK_CLASSIC } from './presets.ts'
import type {
  DeleteCustomThemeRequest,
  SaveCustomThemeRequest,
  SetActiveThemeRequest,
  ThemeDefinition,
  ThemeStudioStatePayload,
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
      version: '0.1.0',
    }
  }
}

/** Host extension for DeepSeek Harness: provides WebServer endpoints for theme management. */
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

      return () => {
        stopReset()
        stopCustom()
        stopActive()
        stopState()
      }
    }, 'fabric-theme-studio: web routes')
  })
}
