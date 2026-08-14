import { defineConfig } from 'tsdown'
import { fabricPlugin } from '@dsh-do/fabric/build'

export default defineConfig(fabricPlugin({
  // Must equal package.json "name": DSH keys the ModuleLoader table by package name.
  id: '@dsh-do/fabric-theme-studio',
}))
