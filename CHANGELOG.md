# Changelog

## 0.8.0

- 迁移到 Fabric 0.7：`overlays.define` 改为窄的 `hud.define`，快速切换 action 改用自定义 `render`。
- 主题工坊 badge 改为 `page.setBadge()`，会随内置与自定义主题数量更新。
- peer dependency 收紧为 `@dsh-do/fabric@^0.7.0`。

## 0.7.3

- **发布闸门**：`prepack` / `prepublishOnly` 强制跑 `pnpm verify`（test + build），杜绝 stale lib 打包。
- 安装文档改为两步：`dsh plugin add` 不会自动安装 peer，必须先装 `@dsh-do/fabric`。
- CI：GitHub Actions verify 流水线（CI 中 link: 依赖切换为 registry 版本）。

## 0.7.2

- 重打包重发：0.7.1 的 tgz 内含未重建的 lib，此版本修正发布物。

## 0.7.1

- 调色盘随主题选择同步（draft 按 activeThemeId 重建）。
- 壁纸上改用 typed Resource；draft 壁纸不再把过期主题写回（修复设置壁纸后跳回 Cyberpunk Neon）。
- 全景展台/HUD 改用运行时 config id，修复页面空白。

## 0.7.0

- 迁移到 Fabric 0.5 define/setup 与 Resource transport。
- 语义 `--fabric-*` 主题注入；状态色 foreground/surface/border 三档。
