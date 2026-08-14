import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from 'fabric/client'
import { ComponentShowcase } from './components/ComponentShowcase.tsx'
import { ThemeGallery } from './components/ThemeGallery.tsx'
import { ThemeOverlayHud } from './components/ThemeOverlayHud.tsx'
import { ThemeSettings } from './components/ThemeSettings.tsx'
import { ThemeToolbarAction } from './components/ThemeToolbarAction.tsx'
import { TokenStudio } from './components/TokenStudio.tsx'
import { themeEngine } from './theme-engine.ts'

/** Required service: Fabric must be available before this client extension starts. */
export const inject = ['fabric'] as const

/** Client-side apply: registers all theme studio pages, toolbar actions, overlay HUD, and settings into Fabric. */
export function apply(ctx: ClientContext): void {
  // Initialize theme engine and wire disposal effect
  ctx.effect(() => {
    themeEngine.init()
    return () => {
      themeEngine.dispose()
    }
  }, 'fabric-theme-studio: theme-engine')

  // 1. Theme Gallery Page
  ctx.fabric.register({
    kind: 'page',
    id: 'theme-gallery',
    order: 0,
    label: '主题工坊',
    component: ThemeGallery,
  })

  // 2. Token Studio (Customizer) Page
  ctx.fabric.register({
    kind: 'page',
    id: 'theme-studio',
    order: 1,
    label: '调色盘',
    component: TokenStudio,
  })

  // 3. Component Showcase Page
  ctx.fabric.register({
    kind: 'page',
    id: 'component-showcase',
    order: 2,
    label: '全景展台',
    component: ComponentShowcase,
  })

  // 4. Workbench Header Toolbar Action
  ctx.fabric.register({
    kind: 'toolbar',
    id: 'theme-quick-switch',
    order: 0,
    component: ThemeToolbarAction,
  })

  // 5. Global Shell Overlay (Floating HUD)
  ctx.fabric.register({
    kind: 'overlay',
    id: 'theme-overlay-hud',
    order: 0,
    component: ThemeOverlayHud,
  })

  // 6. DSH Plugins Settings Tab Contribution
  ctx.fabric.register({
    kind: 'settings',
    id: 'theme-studio-settings',
    order: 0,
    component: ThemeSettings,
  })
}
