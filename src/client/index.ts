import React from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from 'fabric/client'
import { ComponentShowcase } from './components/ComponentShowcase.tsx'
import { ThemeGallery } from './components/ThemeGallery.tsx'
import { ThemeOverlayHud } from './components/ThemeOverlayHud.tsx'
import { ThemeSettings } from './components/ThemeSettings.tsx'
import { ThemeToolbarAction } from './components/ThemeToolbarAction.tsx'
import { TokenStudio } from './components/TokenStudio.tsx'
import { GridIcon, PaletteIcon, SlidersIcon } from './icons.tsx'
import { themeEngine } from './theme-engine.ts'

/** Required service: Fabric must be available before this client extension starts. */
export const inject = ['fabric'] as const

/** Client-side apply: registers all theme studio pages, toolbar actions, overlay HUD, schema config, and mod metadata into Fabric. */
export function apply(ctx: ClientContext): void {
  // Initialize theme engine with Fabric Theme Bridge service and wire disposal effect
  ctx.effect(() => {
    themeEngine.init(ctx.fabric.theme)
    return () => {
      themeEngine.dispose()
    }
  }, 'fabric-theme-studio: theme-engine')

  // 1. Mod Metadata Contribution (Automatically surfaced in Fabric ModMenu)
  ctx.fabric.register({
    kind: 'mod',
    id: 'fabric-theme-studio',
    name: 'Fabric Theme Studio',
    version: '0.3.0',
    description: '交互式主题调色工坊与个性化设计系统展台，驱动 DSH 宿主与 Fabric 扩展组件',
    icon: React.createElement(PaletteIcon, { size: 16 }),
  })

  // 2. Schema-Driven Configuration (Persisted by Host /fabric/config/:id and rendered in ModMenu/Settings)
  ctx.fabric.registerConfig({
    id: 'fabric-theme-studio',
    title: 'Theme Studio 偏好设置',
    description: '配置默认启动主题、系统深浅色外观跟随与 HUD 快捷悬浮窗表现',
    pluginId: 'fabric-theme-studio',
    schema: {
      defaultTheme: {
        type: 'select',
        title: '默认启动主题',
        description: 'DSH 启动时自动载入的色彩配置体系',
        default: 'deepseek-classic',
        options: [
          { label: 'DeepSeek Classic (官方经典)', value: 'deepseek-classic' },
          { label: 'Nord Aurora (极光深蓝)', value: 'nord-aurora' },
          { label: 'Cyberpunk Neon (赛博霓虹)', value: 'cyberpunk-neon' },
          { label: 'Catppuccin Mocha (摩卡暖紫)', value: 'catppuccin-mocha' },
          { label: 'Gruvbox Retro (复古暖棕)', value: 'gruvbox-retro' },
          { label: 'Tokyo Night (东京之夜)', value: 'tokyo-night' },
          { label: 'Solarized Light (日耀浅色)', value: 'solarized-light' },
          { label: 'Monochrome Pro (极致单色)', value: 'monochrome-pro' },
        ],
      },
      autoFollowSystem: {
        type: 'boolean',
        title: '跟随操作系统深浅色模式',
        description: '自动响应操作系统 prefers-color-scheme，在深色与浅色预设间平滑流转',
        default: false,
      },
      hudEnabled: {
        type: 'boolean',
        title: '启用全局快捷调色 HUD',
        description: '在右下角常驻快速调色悬浮球，支持一键切换主题与查看 WCAG 评级',
        default: true,
      },
      transitionSpeed: {
        type: 'number',
        title: '主题渐变过渡时间 (ms)',
        description: '切换主题时 CSS 变量平滑过渡的时长',
        default: 200,
        min: 0,
        max: 1000,
        step: 50,
      },
    },
  })

  // 3. Theme Gallery Page (with Palette icon, 8 presets badge, and keepAlive state)
  ctx.fabric.register({
    kind: 'page',
    id: 'theme-gallery',
    order: 0,
    label: '主题工坊',
    icon: React.createElement(PaletteIcon, { size: 16 }),
    badge: '8',
    keepAlive: true,
    component: ThemeGallery,
  })

  // 4. Token Studio (Customizer) Page (with Sliders icon and keepAlive state)
  ctx.fabric.register({
    kind: 'page',
    id: 'theme-studio',
    order: 1,
    label: '调色盘',
    icon: React.createElement(SlidersIcon, { size: 16 }),
    keepAlive: true,
    component: TokenStudio,
  })

  // 5. Component Showcase Page (with Grid icon and keepAlive state)
  ctx.fabric.register({
    kind: 'page',
    id: 'component-showcase',
    order: 2,
    label: '全景展台',
    icon: React.createElement(GridIcon, { size: 16 }),
    keepAlive: true,
    component: ComponentShowcase,
  })

  // 6. Workbench Header Toolbar Action
  ctx.fabric.register({
    kind: 'toolbar',
    id: 'theme-quick-switch',
    order: 0,
    component: ThemeToolbarAction,
  })

  // 7. Global Shell Overlay (Floating HUD)
  ctx.fabric.register({
    kind: 'overlay',
    id: 'theme-overlay-hud',
    order: 0,
    component: ThemeOverlayHud,
  })

  // 8. DSH Plugins Settings Tab Contribution
  ctx.fabric.register({
    kind: 'settings',
    id: 'theme-studio-settings',
    order: 0,
    component: ThemeSettings,
  })
}
