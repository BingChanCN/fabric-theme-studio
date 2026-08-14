import { defineConfig } from 'tsdown'
import { fabricPlugin } from '@dsh-do/fabric/build'

export default defineConfig(fabricPlugin({
  id: 'fabric-theme-studio',
}))
