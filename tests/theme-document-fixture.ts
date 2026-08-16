import type { FabricDocumentHandle, FabricDocumentSnapshot } from '@dsh-do/fabric/host'
import { themeStudioDocument, type ThemeStudioDocument } from '../src/host.ts'
import { DEEPSEEK_CLASSIC } from '../src/presets.ts'

export function createThemeDocument(
  initial: ThemeStudioDocument = { activeThemeId: DEEPSEEK_CLASSIC.id, customThemes: [], migratedFromStatic: false },
): FabricDocumentHandle<ThemeStudioDocument> {
  let value = initial
  let revision = 0
  const listeners = new Set<() => void>()
  const snapshot = (): FabricDocumentSnapshot<ThemeStudioDocument> => ({ value, revision })
  return {
    definition: themeStudioDocument,
    async read() { return snapshot() },
    async replace(next, expectedRevision) {
      if (expectedRevision !== undefined && expectedRevision !== revision) throw new Error('document conflict')
      value = themeStudioDocument.codec.parse(next)
      revision += 1
      for (const listener of [...listeners]) listener()
      return snapshot()
    },
    async update(updater) {
      value = themeStudioDocument.codec.parse(updater(value))
      revision += 1
      for (const listener of [...listeners]) listener()
      return snapshot()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    close() { listeners.clear() },
  }
}
