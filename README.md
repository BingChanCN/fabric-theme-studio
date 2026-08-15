# Fabric Theme Studio

Fabric 官方 Theme Provider。编辑器数据变成 `FabricThemeDefinition`，由 Fabric runtime 注入 `--fabric-*`，DSH `--dsw-*` 映射留在 Fabric bridge 内部。

## 功能

- 主题工坊、调色盘、全景展台
- 页面 action 快速切换、`ctx.hud.define` 常驻 HUD、动态页面 badge
- `ctx.config.define` 偏好设置
- Host/Client 走 typed Resource（state / active / custom / wallpaper）

## 安装

`dsh plugin add` 不会自动安装 peer 依赖（`dsh.dependencies` 字段当前版本的 DSH 也不会消费）。必须**先装 fabric**，再装本包，否则运行时报 `require("@dsh-do/fabric") missed the module table`：

```bash
# 从 npm 安装（推荐）
dsh plugin --profile web add @dsh-do/fabric
dsh plugin --profile web add @dsh-do/fabric-theme-studio
```

```bash
# 或本地 tgz
cd D:/dsh-dev/fabric && pnpm pack --pack-destination .pack-probe
cd D:/dsh-dev/fabric-theme-studio && pnpm pack --pack-destination .pack-probe
dsh plugin --profile web add "D:/dsh-dev/fabric/.pack-probe/dsh-do-fabric-0.7.0.tgz"
dsh plugin --profile web add "D:/dsh-dev/fabric-theme-studio/.pack-probe/dsh-do-fabric-theme-studio-0.8.0.tgz"
```
