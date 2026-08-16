import { defineCapability } from '@dsh-do/fabric/contracts'
import type { ThemeDefinition } from './types.ts'

export interface ThemeStudioCapabilityApi {
  getActiveTheme(): ThemeDefinition
  setActiveTheme(themeId: string): void
  getPresets(): readonly ThemeDefinition[]
  getCustomThemes(): readonly ThemeDefinition[]
  getAllThemes(): readonly ThemeDefinition[]
  cycleNextTheme(): ThemeDefinition
  saveCustomTheme(theme: ThemeDefinition): void
  deleteCustomTheme(themeId: string): boolean
  resetAll(): void
}

export const themeStudioCapability = defineCapability<ThemeStudioCapabilityApi>({
  owner: '@dsh-do/fabric-theme-studio',
  id: 'theme',
  version: '1',
  side: 'client',
})
