import React from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@dsh-do/fabric/client'
import type { ThemeDefinition } from '../types.ts'
import { ComponentShowcase } from './components/ComponentShowcase.tsx'
import { ThemeGallery } from './components/ThemeGallery.tsx'
import { ThemeOverlayHud } from './components/ThemeOverlayHud.tsx'
import { ThemeSettings } from './components/ThemeSettings.tsx'
import { ThemeToolbarAction } from './components/ThemeToolbarAction.tsx'
import { TokenStudio } from './components/TokenStudio.tsx'
import { GridIcon, PaletteIcon, SlidersIcon } from './icons.tsx'
import { themeEngine } from './theme-engine.ts'

/** Public Inter-Mod Communication (IMC) API exported via `ctx.fabric.registerCapability`. */
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

/** Required service: Fabric must be available before this client extension starts. */
export const inject = ['fabric'] as const

/** Client-side apply: registers all theme studio pages, toolbar actions, overlay HUD, schema config, commands, capabilities, and mod metadata into Fabric. */
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
    version: '0.6.2',
    description: '交互式主题调色工坊、智能色彩和声生成、VSCode 主题转换、聊天背景壁纸与纯 CSS 硬件加速动态材质',
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
          { label: 'GitHub Light (GitHub 浅色)', value: 'github-light' },
          { label: 'Catppuccin Latte (奶泡白昼)', value: 'catppuccin-latte' },
          { label: 'Atom One Light (标志浅色)', value: 'one-light' },
          { label: 'Solarized Light (日耀浅色)', value: 'solarized-light' },
          { label: 'Monochrome Pro (极致单色)', value: 'monochrome-pro' },
        ],
      },
      dynamicEffectsEnabled: {
        type: 'boolean',
        title: '启用纯 CSS 硬件加速动态背景',
        description: '在背景渲染极光流光、赛博网格与弥散渐变等低功耗环境光效',
        default: true,
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

  // 3. Inter-Mod Communication Capability (IMC)
  const capabilityApi: ThemeStudioCapabilityApi = {
    getActiveTheme: () => themeEngine.getActiveTheme(),
    setActiveTheme: (id: string) => themeEngine.setActiveTheme(id),
    getPresets: () => themeEngine.getPresets(),
    getCustomThemes: () => themeEngine.getCustomThemes(),
    getAllThemes: () => themeEngine.getAllThemes(),
    cycleNextTheme: () => {
      const all = themeEngine.getAllThemes()
      const current = themeEngine.getActiveTheme()
      const nextIndex = (all.findIndex((t: ThemeDefinition) => t.id === current.id) + 1) % all.length
      const next = all[nextIndex] ?? all[0]!
      themeEngine.setActiveTheme(next.id)
      return next
    },
    saveCustomTheme: (theme: ThemeDefinition) => themeEngine.saveCustomTheme(theme),
    deleteCustomTheme: (themeId: string) => themeEngine.deleteCustomTheme(themeId),
    resetAll: () => themeEngine.resetAll(),
  }
  ctx.fabric.registerCapability('theme-studio-api', capabilityApi)

  // 4. Command Palette Contributions (Mod+K searchable & global shortcut dispatch)
  ctx.fabric.register({
    kind: 'command',
    id: 'theme-studio.open-gallery',
    title: '主题工坊: 打开主题预设画廊',
    description: '浏览并应用 8 大经典设计预设及自定义色彩体系',
    shortcut: 'Mod+Shift+T',
    pluginId: 'fabric-theme-studio',
    order: 10,
    handler: () => {
      ctx.fabric.open('theme-gallery')
    },
  })

  ctx.fabric.register({
    kind: 'command',
    id: 'theme-studio.open-studio',
    title: '调色盘: 打开 Token 交互微调',
    description: '调节 DSH 与 Fabric 语义设计变量与对比度',
    shortcut: 'Mod+Shift+E',
    pluginId: 'fabric-theme-studio',
    order: 20,
    handler: () => {
      ctx.fabric.open('theme-studio')
    },
  })

  ctx.fabric.register({
    kind: 'command',
    id: 'theme-studio.open-showcase',
    title: '全景展台: 打开全量组件与基建演练',
    description: '检视 Fabric v0.4.0 命令、能力与浮层组件表现',
    shortcut: 'Mod+Shift+S',
    pluginId: 'fabric-theme-studio',
    order: 30,
    handler: () => {
      ctx.fabric.open('component-showcase')
    },
  })

  ctx.fabric.register({
    kind: 'command',
    id: 'theme-studio.cycle-theme',
    title: '主题工坊: 快速轮播下一套主题',
    description: '依次流转并激活下一套主题色彩体系',
    shortcut: 'Mod+Alt+T',
    pluginId: 'fabric-theme-studio',
    order: 40,
    handler: () => {
      const next = capabilityApi.cycleNextTheme()
      ctx.fabric.notify(`已快捷切换主题至「${next.name}」`, { tone: 'info', timeoutMs: 2000 })
    },
  })

  ctx.fabric.register({
    kind: 'command',
    id: 'theme-studio.export-json',
    title: '主题工坊: 导出主题配置为 JSON',
    description: '打包并复制主题配置至系统剪贴板',
    shortcut: 'Mod+Shift+X',
    pluginId: 'fabric-theme-studio',
    order: 50,
    handler: () => {
      const theme = themeEngine.getActiveTheme()
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        void navigator.clipboard.writeText(JSON.stringify(theme, null, 2))
        ctx.fabric.notify(`已复制主题「${theme.name}」JSON 到剪贴板`, { tone: 'success', timeoutMs: 2000 })
      }
    },
  })

  // 5. Theme Gallery Page (with Palette icon, 8 presets badge, and keepAlive state)
  ctx.fabric.register({
    kind: 'page',
    id: 'theme-gallery',
    order: 0,
    label: '主题工坊',
    icon: React.createElement(PaletteIcon, { size: 16 }),
    badge: '11',
    keepAlive: true,
    pluginId: 'fabric-theme-studio',
    component: ThemeGallery,
  })

  // 6. Token Studio (Customizer) Page (with Sliders icon and keepAlive state)
  ctx.fabric.register({
    kind: 'page',
    id: 'theme-studio',
    order: 1,
    label: '调色盘',
    icon: React.createElement(SlidersIcon, { size: 16 }),
    keepAlive: true,
    pluginId: 'fabric-theme-studio',
    component: TokenStudio,
  })

  // 7. Component Showcase Page (with Grid icon and keepAlive state)
  ctx.fabric.register({
    kind: 'page',
    id: 'component-showcase',
    order: 2,
    label: '全景展台',
    icon: React.createElement(GridIcon, { size: 16 }),
    keepAlive: true,
    pluginId: 'fabric-theme-studio',
    component: ComponentShowcase,
  })

  // 8. Workbench Header Toolbar Action
  ctx.fabric.register({
    kind: 'toolbar',
    id: 'theme-quick-switch',
    order: 0,
    component: ThemeToolbarAction,
  })

  // 9. Global Shell Overlay (Floating HUD)
  ctx.fabric.register({
    kind: 'overlay',
    id: 'theme-overlay-hud',
    order: 0,
    component: ThemeOverlayHud,
  })

  // 10. DSH Plugins Settings Tab Contribution
  ctx.fabric.register({
    kind: 'settings',
    id: 'theme-studio-settings',
    order: 0,
    component: ThemeSettings,
  })
}
