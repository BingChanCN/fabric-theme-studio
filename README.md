# Fabric Theme Studio

Fabric 官方 Theme Provider。编辑器数据变成 `FabricThemeDefinition`，由 Fabric runtime 注入 `--fabric-*`，DSH `--dsw-*` 映射留在 Fabric bridge 内部。

## 功能

- 主题工坊、调色盘、全景展台
- 页面 action 快速切换、overlay HUD
- `ctx.config.define` 偏好设置
- Host/Client 走 typed Resource（state / active / custom / wallpaper）

## 安装

先装 `@dsh-do/fabric@^0.5.0`，再装本包：

```bash
pnpm build
pnpm pack --pack-destination .pack-probe
dsh plugin --profile web add ".pack-probe/dsh-do-fabric-theme-studio-0.7.1.tgz"
```
