# Fabric Theme Studio

Fabric 1.0 Runtime Theme Provider。编辑器数据是 `FabricThemeDefinition`，由 Fabric 浏览器单例注入 `--fabric-*`；DSH token 映射保留在 Fabric bridge 内部。

## 功能

- 主题工坊、调色盘、全景展台
- 页面 action、HUD 与动态 badge
- Config 偏好设置
- Host 状态存入 profile-local typed Document
- 壁纸存入 Fabric Blob store，Client 只持 opaque Blob URL
- 0.x 旧 localStorage/壁纸目录的一次性保守迁移；已有 1.0 数据不覆盖，旧文件不自动删除

## 安装

先把 Fabric Core 作为当前 Profile 唯一的静态基础插件安装并重启一次：

```sh
dsh plugin --profile web add @dsh-do/fabric
```

随后在 Fabric Mods 或 dsh-do 插件市场安装：

```text
@dsh-do/fabric-theme-studio
```

Theme Studio 是 Runtime Package，不再执行 `dsh plugin add`，安装、升级、停用、回退和删除均无需重启 DSH。

本地开发：

```sh
pnpm install
fabric build
fabric verify
fabric dev --profile web
```

发布闸门：

```sh
fabric pack
```

该命令验证工作目录与最终 npm tgz；失败产物不会保留。
