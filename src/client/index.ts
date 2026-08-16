import { createElement } from 'react'
import {
  defineClientPlugin,
  type FabricClientPluginContext,
  type FabricConfigDefinition,
  type FabricPageDefinition,
  type JsonValue,
} from '@dsh-do/fabric/client'
import { themeStudioCapability, type ThemeStudioCapabilityApi } from '../contracts.ts'
import { ComponentShowcase } from './components/ComponentShowcase.tsx'
import { ThemeGallery } from './components/ThemeGallery.tsx'
import { ThemeHud } from './components/ThemeHud.tsx'
import { ThemeSettings } from './components/ThemeSettings.tsx'
import { ThemeToolbarAction } from './components/ThemeToolbarAction.tsx'
import { TokenStudio } from './components/TokenStudio.tsx'
import { GridIcon, PaletteIcon, SlidersIcon } from './icons.tsx'
import { themeEngine } from './theme-engine.ts'
import { THEME_CONFIG_ID } from './config-id.ts'

export { THEME_CONFIG_ID }

export type { ThemeStudioCapabilityApi } from '../contracts.ts'
export { themeStudioCapability } from '../contracts.ts'

interface ThemeStudioConfigValues {
  readonly [key: string]: JsonValue
  defaultTheme?: string
  dynamicEffectsEnabled?: boolean
  autoFollowSystem?: boolean
  hudEnabled?: boolean
  transitionSpeed?: number
}

const configSchema: FabricConfigDefinition<ThemeStudioConfigValues>['schema'] = {
  defaultTheme: {
    type: 'select', title: '默认启动主题', description: 'DSH 启动时自动载入的色彩配置体系', default: 'deepseek-classic',
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
    type: 'boolean', title: '启用纯 CSS 硬件加速动态背景', description: '在背景渲染环境光效', default: true,
  },
  autoFollowSystem: {
    type: 'boolean', title: '跟随操作系统深浅色模式', description: '自动响应系统外观', default: false,
  },
  hudEnabled: {
    type: 'boolean', title: '启用全局快捷调色 HUD', description: '显示快速切换主题的悬浮入口', default: true,
  },
  transitionSpeed: {
    type: 'number', title: '主题渐变过渡时间 (ms)', description: '主题切换过渡时长', default: 200, min: 0, max: 1000, step: 50,
  },
}

const themeDefinition = defineClientPlugin({
  descriptor: {
    name: 'Fabric Theme Studio',
    description: 'Interactive theme provider, palette editor and component showcase.',
    icon: createElement(PaletteIcon, { size: 16 }),
  },
  setup(ctx: FabricClientPluginContext) {
    themeEngine.init(ctx.theme, ctx.resources)
    ctx.lifecycle.onDispose(() => { themeEngine.dispose() })

    const preferences = ctx.config.define({
      id: 'preferences',
      title: 'Theme Studio 偏好设置',
      description: '配置默认主题、系统外观跟随与 HUD 表现',
      schema: configSchema,
      settings: ThemeSettings,
    })

    const capabilityApi: ThemeStudioCapabilityApi = {
      getActiveTheme: () => themeEngine.getActiveTheme(),
      setActiveTheme: id => { themeEngine.setActiveTheme(id) },
      getPresets: () => themeEngine.getPresets(),
      getCustomThemes: () => themeEngine.getCustomThemes(),
      getAllThemes: () => themeEngine.getAllThemes(),
      cycleNextTheme: () => themeEngine.cycleNextTheme(),
      saveCustomTheme: theme => { themeEngine.saveCustomTheme(theme) },
      deleteCustomTheme: id => themeEngine.deleteCustomTheme(id),
      resetAll: () => { themeEngine.resetAll() },
    }
    ctx.capabilities.provide(themeStudioCapability, capabilityApi)

    const gallery: FabricPageDefinition = {
      id: 'theme-gallery', order: 0, label: '主题工坊', icon: createElement(PaletteIcon, { size: 16 }), keepAlive: true,
      view: ThemeGallery,
      actions: [{ id: 'quick-switch', order: 0, label: '快速切换主题', render: ThemeToolbarAction }],
      config: [preferences],
    }
    const galleryPage = ctx.pages.define(gallery)
    const syncGalleryBadge = () => { galleryPage.setBadge(themeEngine.getAllThemes().length) }
    syncGalleryBadge()
    ctx.lifecycle.onDispose(themeEngine.subscribe(syncGalleryBadge))
    ctx.pages.define({
      id: 'theme-studio', order: 1, label: '调色盘', icon: createElement(SlidersIcon, { size: 16 }), keepAlive: true,
      view: TokenStudio,
      config: [preferences],
    })
    ctx.pages.define({
      id: 'component-showcase', order: 2, label: '全景展台', icon: createElement(GridIcon, { size: 16 }), keepAlive: true,
      view: ComponentShowcase,
      config: [preferences],
    })
    ctx.hud.define({ id: 'theme-hud', component: ThemeHud, config: [preferences] })

    const commands = [
      { id: 'open-gallery', title: '主题工坊: 打开主题预设画廊', description: '浏览并应用主题预设', shortcut: 'Mod+Shift+T', order: 10, run: () => ctx.pages.open('theme-gallery') },
      { id: 'open-studio', title: '调色盘: 打开 Token 交互微调', description: '调节 Fabric 语义设计变量', shortcut: 'Mod+Shift+E', order: 20, run: () => ctx.pages.open('theme-studio') },
      { id: 'open-showcase', title: '全景展台: 打开组件演练', description: '检视 Fabric 组件表现', shortcut: 'Mod+Shift+S', order: 30, run: () => ctx.pages.open('component-showcase') },
      { id: 'cycle-theme', title: '主题工坊: 快速轮播下一套主题', description: '激活下一套主题', shortcut: 'Mod+Alt+T', order: 40, run: () => { const next = capabilityApi.cycleNextTheme(); ctx.notify(`已快捷切换主题至「${next.name}」`, { tone: 'info', timeoutMs: 2000 }) } },
      { id: 'export-json', title: '主题工坊: 导出主题配置为 JSON', description: '复制主题配置到剪贴板', shortcut: 'Mod+Shift+X', order: 50, run: async () => {
        const theme = themeEngine.getActiveTheme()
        if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
          await navigator.clipboard.writeText(JSON.stringify(theme, null, 2))
          ctx.notify(`已复制主题「${theme.name}」JSON 到剪贴板`, { tone: 'success', timeoutMs: 2000 })
        }
      } },
    ]
    for (const command of commands) ctx.commands.define(command)
  },
})

export const definition = themeDefinition
export default themeDefinition
