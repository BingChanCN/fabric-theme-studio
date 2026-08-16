import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FabricPluginBlobHost } from '@dsh-do/fabric/host'
import { TOKYO_NIGHT } from '../src/presets.ts'
import { ThemeHostStore, getLegacyWallpaperStorageDir } from '../src/host.ts'
import type { ThemeDefinition } from '../src/types.ts'
import { createThemeDocument } from './theme-document-fixture.ts'

const temporary: string[] = []
const originalDshHome = process.env.DSH_HOME

afterEach(async () => {
  if (originalDshHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = originalDshHome
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

function blobHost(): FabricPluginBlobHost & { readonly bodies: Uint8Array[] } {
  const bodies: Uint8Array[] = []
  return {
    bodies,
    async put(input) {
      bodies.push(input.body)
      return { owner: '@dsh-do/fabric-theme-studio', id: `blob-${bodies.length}`, contentType: input.contentType, size: input.body.byteLength }
    },
    async read() { throw new Error('not used') },
    async delete() {},
    url(ref) { return `/fabric/blob/${encodeURIComponent(ref.owner)}/${ref.id}` },
  }
}

describe('Theme wallpaper state', () => {
  it('persists opaque Fabric Blob URLs inside custom themes', async () => {
    const document = createThemeDocument()
    const store = new ThemeHostStore(document)
    const customWithWallpaper: ThemeDefinition = {
      ...TOKYO_NIGHT,
      id: 'custom-wp-1',
      name: 'Custom Tokyo Wallpaper',
      material: { wallpaper: { enabled: true, url: '/fabric/blob/%40dsh-do%2Ffabric-theme-studio/opaque-ref', dim: 0.5 } },
    }

    await store.saveCustomTheme(customWithWallpaper)
    await store.setActiveThemeId('custom-wp-1')

    const restarted = new ThemeHostStore(document)
    const active = (await restarted.getStatePayload()).activeTheme
    expect(active.id).toBe('custom-wp-1')
    expect(active.material?.wallpaper?.url).toBe('/fabric/blob/%40dsh-do%2Ffabric-theme-studio/opaque-ref')
  })

  it('migrates an official legacy wallpaper once without deleting the old file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'fabric-theme-migrate-'))
    temporary.push(root)
    process.env.DSH_HOME = root
    await mkdir(getLegacyWallpaperStorageDir(), { recursive: true })
    const legacyFile = join(getLegacyWallpaperStorageDir(), 'legacy.png')
    await writeFile(legacyFile, Buffer.from([1, 2, 3]))
    const legacyTheme: ThemeDefinition = {
      ...TOKYO_NIGHT,
      id: 'legacy-custom',
      name: 'Legacy custom',
      material: { wallpaper: { enabled: true, url: '/fabric/asset/fabric-theme-studio/wallpaper/legacy.png' } },
    }
    const document = createThemeDocument()
    const store = new ThemeHostStore(document)
    const blobs = blobHost()

    await expect(store.migrateStaticData({ activeThemeId: legacyTheme.id, customThemes: [legacyTheme] }, blobs)).resolves.toEqual({
      migrated: true,
      wallpapersMigrated: 1,
    })
    const state = await store.getStatePayload()
    expect(state.activeTheme.material?.wallpaper?.url).toBe('/fabric/blob/%40dsh-do%2Ffabric-theme-studio/blob-1')
    expect(Array.from(blobs.bodies[0] ?? [])).toEqual([1, 2, 3])
    await expect(readFile(legacyFile)).resolves.toEqual(Buffer.from([1, 2, 3]))

    const put = vi.spyOn(blobs, 'put')
    await expect(store.migrateStaticData({ activeThemeId: 'other', customThemes: [] }, blobs)).resolves.toEqual({
      migrated: false,
      wallpapersMigrated: 0,
    })
    expect(put).not.toHaveBeenCalled()
  })

  it('never overwrites an already populated Runtime document during migration', async () => {
    const document = createThemeDocument({
      activeThemeId: TOKYO_NIGHT.id,
      customThemes: [],
      migratedFromStatic: false,
    })
    const store = new ThemeHostStore(document)
    await expect(store.migrateStaticData({ activeThemeId: 'deepseek-classic', customThemes: [] }, blobHost())).resolves.toEqual({
      migrated: false,
      wallpapersMigrated: 0,
    })
    expect((await store.getStatePayload()).activeThemeId).toBe(TOKYO_NIGHT.id)
  })
})
