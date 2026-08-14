# Fabric Theme Studio

Fabric Theme Studio 是基于 **Fabric** 前端框架构建的个性化主题工坊与色彩系统展示插件，面向 DeepSeek Harness（DSH）客户端生态。

它展示了如何利用 Fabric 的四大核心贡献（Page 工作台页面、Toolbar 标题栏动作、Overlay 全局浮层、Settings 设置页扩展）、`fabric/ui` 组件库、`fabric/sdk` 请求状态流以及 DSH 的 `--dsw-*` 设计令牌体系，构建全栈式、响应式、实时热更新的主题个性化体验。

## 核心特性

- **主题工坊 (Theme Gallery)**：精选 8 套官方与经典主题预设（DeepSeek Classic, Nord Aurora, Cyberpunk Neon, Catppuccin Mocha, Gruvbox Retro, Tokyo Night, Solarized Light, Monochrome Pro），支持实时切换、分类过滤与无障碍对比度等级检测（WCAG AAA/AA）。
- **调色盘 (Token Studio)**：深度交互式自定义 DSH 语义设计令牌（底色、表面、文本阶梯、品牌色、强调色、状态指示色、圆角与阴影），右侧带实时卡片预览与无障碍对比度评分仪，支持将自定色彩保存为全新主题。
- **全景展台 (Component Showcase)**：全面检验 Fabric UI 标准组件（`PageHeader`, `Section`, `Badge`, `ToolbarButton`, `LoadingState`, `EmptyState`, `ErrorState`, `AsyncView`）在所选主题下的视觉渲染表现，并集成 Fabric 全局 Toast 消息栈触发器。
- **标题栏快速轮播 (Toolbar Quick Switch)**：在 Fabric 工作台右上角常驻主题色标与一键轮播切换按钮。
- **全局浮动调色盘 (Theme Quick HUD)**：作为 DSH Shell 级 `overlay` 浮层，支持在任意界面一键呼出迷你调色盘快速试色。
- **设置页偏好接入 (Settings Panel)**：在 DSH 的 Plugins 设置标签内提供默认启动主题配置、主题数据 JSON 导入导出与缓存重置。
- **全栈状态持久化 (Host WebServer)**：Node.js 端提供 `/api/theme-studio/*` 路由，演示 `fabric/sdk` 与客户端生命周期的持久化与状态同步。

## 安装与构建

### 1. 构建与本地打包

```bash
cd D:/dsh-dev/fabric-theme-studio
pnpm install
pnpm run build
pnpm pack --pack-destination .pack-probe
```

### 2. 添加到 DSH Profile

```bash
dsh plugin --profile web add "D:/dsh-dev/fabric-theme-studio/.pack-probe/dsh-do-fabric-theme-studio-0.6.2.tgz"
dsh --profile web
```

## 测试与验证

```bash
pnpm run typecheck   # 严格 TypeScript 类型检查 (exactOptionalPropertyTypes)
pnpm run test        # Vitest 单元与构建契约测试套件
```

## 贡献接入架构

```tsx
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@dsh-do/fabric/client'
import { ThemeGallery } from './components/ThemeGallery.tsx'
import { TokenStudio } from './components/TokenStudio.tsx'
import { ComponentShowcase } from './components/ComponentShowcase.tsx'
import { ThemeToolbarAction } from './components/ThemeToolbarAction.tsx'
import { ThemeOverlayHud } from './components/ThemeOverlayHud.tsx'
import { ThemeSettings } from './components/ThemeSettings.tsx'
import { themeEngine } from './theme-engine.ts'

export const inject = ['fabric'] as const

export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    themeEngine.init()
    return () => themeEngine.dispose()
  }, 'fabric-theme-studio: theme-engine')

  // 注册页面贡献
  ctx.fabric.register({ kind: 'page', id: 'theme-gallery', order: 0, label: '主题工坊', component: ThemeGallery })
  ctx.fabric.register({ kind: 'page', id: 'theme-studio', order: 1, label: '调色盘', component: TokenStudio })
  ctx.fabric.register({ kind: 'page', id: 'component-showcase', order: 2, label: '全景展台', component: ComponentShowcase })

  // 注册工具栏贡献
  ctx.fabric.register({ kind: 'toolbar', id: 'theme-quick-switch', order: 0, component: ThemeToolbarAction })

  // 注册全局浮层贡献
  ctx.fabric.register({ kind: 'overlay', id: 'theme-overlay-hud', order: 0, component: ThemeOverlayHud })

  // 注册设置页贡献
  ctx.fabric.register({ kind: 'settings', id: 'theme-studio-settings', order: 0, component: ThemeSettings })
}
```

## License

MIT
