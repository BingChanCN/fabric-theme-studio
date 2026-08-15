import { useState } from 'react'
import type { FabricPageProps } from '@dsh-do/fabric/client'
import {
  Badge,
  ConfigForm,
  Dropdown,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  Page,
  PageHeader,
  Popover,
  Section,
  ToolbarButton,
  Z_INDEX,
  useFabricConfig,
} from '@dsh-do/fabric/ui'
import type { FabricConfigSchema } from '@dsh-do/fabric/client'
import { THEME_CONFIG_ID } from '../config-id.ts'
import { useThemeStudio } from '../theme-engine.ts'
import styles from '../styles/showcase.module.css'

const DEMO_SCHEMA: FabricConfigSchema = {
  enableTelemetry: {
    type: 'boolean',
    title: '启用性能遥测与分析 (Telemetry)',
    description: '收集渲染帧率与 Token 注入延迟',
    default: true,
  },
  endpoint: {
    type: 'string',
    title: '上报服务器地址 (Endpoint URL)',
    default: 'https://telemetry.local/v1',
    placeholder: 'https://...',
  },
  logLevel: {
    type: 'select',
    title: '运行日志级别 (Log Level)',
    default: 'info',
    options: [
      { label: 'Debug (调试输出)', value: 'debug' },
      { label: 'Info (常规信息)', value: 'info' },
      { label: 'Warn (仅警告)', value: 'warn' },
      { label: 'Error (仅致命错误)', value: 'error' },
    ],
  },
  sampleRate: {
    type: 'number',
    title: '采样率比例 (%)',
    description: '每秒抽样分析的会话比例',
    default: 80,
    min: 0,
    max: 100,
    step: 5,
  },
  notes: {
    type: 'textarea',
    title: '备注说明 (Notes)',
    default: 'Fabric Phase 3 Commands & IMC Demo',
    placeholder: '输入自定义说明...',
  },
}

const SHORTCUT_REGISTRY = [
  { key: 'Mod + K', desc: '打开 Fabric 全局命令搜索面板 (Command Palette)', kind: 'Fabric 核心' },
  { key: 'Mod + Shift + T', desc: '跳转至「主题工坊」浏览预设画廊', kind: 'Theme Studio' },
  { key: 'Mod + Shift + E', desc: '跳转至「调色盘」微调设计 Token', kind: 'Theme Studio' },
  { key: 'Mod + Shift + S', desc: '跳转至「全景展台」检视组件', kind: 'Theme Studio' },
  { key: 'Mod + Alt + T', desc: '轮播切换并激活下一套主题预设', kind: 'Theme Studio' },
  { key: 'Mod + Shift + X', desc: '打包并导出当前活动主题至剪贴板', kind: 'Theme Studio' },
]

export function ComponentShowcase(props: FabricPageProps) {
  const { activeTheme, allThemes, setActiveTheme } = useThemeStudio()
  const config = useFabricConfig(props.config(THEME_CONFIG_ID))
  const [asyncMode, setAsyncMode] = useState<'loaded' | 'loading' | 'empty' | 'error'>('loaded')
  const [inputText, setInputText] = useState('DeepSeek Harness + Fabric v0.6')
  const [toggleChecked, setToggleChecked] = useState(true)
  const [sliderVal, setSliderVal] = useState(72)

  // Demo dynamic schema values for ConfigForm showcase
  const [demoFormValues, setDemoFormValues] = useState<Record<string, unknown>>({
    enableTelemetry: true,
    endpoint: 'https://telemetry.local/v1',
    logLevel: 'info',
    sampleRate: 80,
    notes: 'Fabric Phase 3 Commands & IMC Demo',
  })

  // Fabric v0.5 & v0.6 Interaction Demos
  const [demoModalOpen, setDemoModalOpen] = useState(false)
  const [demoModalSize, setDemoModalSize] = useState<'sm' | 'md' | 'lg'>('md')
  const [popoverPlacement, setPopoverPlacement] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom')

  const triggerToast = (tone: 'info' | 'success' | 'warning' | 'error') => {
    const toneLabels = {
      info: '这是一条普通信息通知，展示 Fabric Toast 消息栈',
      success: '恭喜！操作已成功执行，当前主题渲染正常',
      warning: '请注意：检测到配置项有变动，请及时保存',
      error: '错误：模拟的服务端连接异常，请重试',
    }
    props.notify(toneLabels[tone], { tone, timeoutMs: 4000 })
  }

  const handleTestCapabilityCycle = () => {
    const nextIndex = (allThemes.findIndex(t => t.id === activeTheme.id) + 1) % allThemes.length
    const next = allThemes[nextIndex]
    if (next) {
      setActiveTheme(next.id)
      props.notify(`[IMC capability] 跨插件调用成功: 切换至「${next.name}」`, {
        tone: 'success',
        timeoutMs: 2500,
      })
    }
  }

  const dropdownDemoItems = [
    {
      id: 'item1',
      label: '导出当前主题配置 (.json)',
      onClick: () => props.notify('已触发导出操作', { tone: 'info' }),
    },
    {
      id: 'item2',
      label: '广播主题变更事件',
      onClick: () => props.notify('已广播 ThemeChange 事件', { tone: 'success' }),
    },
    {
      id: 'item3',
      label: '禁用动作示例',
      disabled: true,
    },
    {
      id: 'item4',
      label: '危险：重置所有自定义配置',
      danger: true,
      onClick: () => props.notify('触发危险动作', { tone: 'warning' }),
    },
  ]

  return (
    <Page className={styles.showcasePage ?? ''}>
      <PageHeader
        title="全景展台 (Component Showcase)"
        description="全量呈现 Fabric 0.6 命令系统、快捷键、跨插件 IMC 能力与浮层设计基座"
        actions={
          <div className={styles.headerActions}>
            <ToolbarButton
              label="切换回工坊"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              }
              onClick={() => props.openFabric('theme-gallery')}
            />
            <ToolbarButton
              label="微调当前色盘"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              }
              onClick={() => props.openFabric('theme-studio')}
            />
          </div>
        }
      />

      {/* Section 1: Active Theme Banner */}
      <Section title="当前活动主题" description="当前工作台生效的色彩系统标识">
        <div className={styles.activeBanner}>
          <div className={styles.bannerInfo}>
            <span className={styles.bannerTitle}>{activeTheme.name}</span>
            <span className={styles.bannerDesc}>{activeTheme.description}</span>
          </div>
          <div className={styles.bannerBadges}>
            <Badge tone="info">{activeTheme.category.toUpperCase()}</Badge>
            <Badge tone="success">评级: {activeTheme.contrastRating ?? 'AAA'}</Badge>
            {activeTheme.material?.backgroundEffect && activeTheme.material.backgroundEffect !== 'none' && (
              <Badge tone="info">✨ 动态: {activeTheme.material.backgroundEffect}</Badge>
            )}
            {activeTheme.material?.wallpaper?.enabled && activeTheme.material.wallpaper.url && (
              <Badge tone="success">🖼️ 自定义壁纸已挂载</Badge>
            )}
          </div>
        </div>
      </Section>

      {/* Section: Material & Ambient Dynamics Showcase */}
      <Section
        title="🪟 材质质感与纯 CSS 动态背景展台 (Materials & Dynamics)"
        description="呈现毛玻璃半透明、物理倒角高光、微噪点纹理与 GPU 硬件加速环境光效"
      >
        <div className={styles.materialGrid}>
          {/* Acrylic Glass Card */}
          <div className={styles.materialCard}>
            <div className={styles.materialCardTitle}>
              <span>✨ 亚克力毛玻璃 (Acrylic Glass)</span>
              <Badge tone="info">Backdrop Blur</Badge>
            </div>
            <p className={styles.materialCardDesc}>
              利用 backdrop-filter: blur(16px) 透出底层动态背景与色彩，打破扁平单调色块。
            </p>
            <div className={styles.acrylicSample}>
              <span>🪟 这是带有亚克力模糊半透明的浮层卡片，下方内容将产生柔和漫反射效果</span>
            </div>
          </div>

          {/* Chamfer Edge Lighting Card */}
          <div className={styles.materialCard}>
            <div className={styles.materialCardTitle}>
              <span>📐 物理倒角高光 (Chamfer Edge)</span>
              <Badge tone="info">Physical Light</Badge>
            </div>
            <p className={styles.materialCardDesc}>
              结合顶部 1px 受光面微高光与环境遮蔽 (AO) 柔和阴影，增强 UI 面板的实体层深感。
            </p>
            <div className={styles.chamferSample}>
              <span>💡 顶部边缘具备物理倒角微高光，面板轮廓层次清晰分明</span>
            </div>
          </div>

          {/* Ambient Dynamics Quick Switch */}
          <div className={styles.materialCard}>
            <div className={styles.materialCardTitle}>
              <span>🌌 动态环境光效 (Pure CSS GPU)</span>
              <Badge tone="success">0% JS Overhead</Badge>
            </div>
            <p className={styles.materialCardDesc}>
              零 JS 循环占用、后台自动冻结、严格响应减少动画偏好的纯 CSS 硬件加速环境氛围。
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  props.notify('已激活极光流光 (Aurora Glow) 动态背景', { tone: 'info' })
                }}
              >
                极光流光
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  props.notify('已激活赛博网格 (Cyber Grid) 动态背景', { tone: 'info' })
                }}
              >
                赛博网格
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  props.notify('已激活弥散流光 (Mesh Gradient) 动态背景', { tone: 'info' })
                }}
              >
                弥散流光
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Section 2: Phase 3 Commands & IMC Capabilities Demo */}
      <Section
        title="Fabric 0.6 命令面板与跨插件能力 (Commands & Capabilities IMC)"
        description="支持 Mod+K 全局命令搜索唤起、专属热键绑定与跨插件接口注入交互"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                props.notify('按按下键盘「Mod+K」（Mac 为 Cmd+K / Win 为 Ctrl+K）即可唤起全局命令面板', {
                  tone: 'info',
                  timeoutMs: 4000,
                })
              }}
            >
              按 Mod+K 打开命令面板
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleTestCapabilityCycle}
            >
              测试 IMC Capability (theme-studio-api.cycleNextTheme)
            </button>
          </div>

          <div style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dsw-alias-label-primary)' }}>
              已注册全局命令与快捷键矩阵：
            </span>
            <div style={{ marginTop: '8px', border: '1px solid var(--dsw-alias-border-l2, #333)', borderRadius: '6px', overflow: 'hidden' }}>
              {SHORTCUT_REGISTRY.map((sc, idx) => (
                <div
                  key={sc.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 14px',
                    borderBottom: idx < SHORTCUT_REGISTRY.length - 1 ? '1px solid var(--dsw-alias-border-l2, #282833)' : 'none',
                    backgroundColor: idx % 2 === 0 ? 'var(--dsw-alias-bg-layer-1, #181820)' : 'var(--dsw-alias-bg-base, #121218)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <code style={{ background: 'var(--dsw-alias-bg-layer-3, #2a2a38)', padding: '2px 8px', borderRadius: '4px', color: 'var(--dsw-alias-brand-primary, #4176e6)', fontWeight: 'bold' }}>
                      {sc.key}
                    </code>
                    <span style={{ color: 'var(--dsw-alias-label-primary)' }}>{sc.desc}</span>
                  </div>
                  <Badge tone={sc.kind === 'Fabric 核心' ? 'info' : 'neutral'}>{sc.kind}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Section 3: Phase 2 Schema Config & ConfigForm Demo */}
      <Section
        title="Fabric v0.3.0 模式化配置引擎 (Schema Config & ConfigForm)"
        description="通过 JSON Schema 声明配置，自动生成类型安全的表单并与 Host 端同步持久化"
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Badge tone={config.status === 'ready' ? 'success' : 'info'}>
              Store 状态: {config.status}
            </Badge>
            {config.dirty && <Badge tone="warning">未保存改动</Badge>}
          </div>
        }
      >
        <div style={{ backgroundColor: 'var(--dsw-alias-bg-layer-1, #181820)', padding: '16px', borderRadius: '8px', border: '1px solid var(--dsw-alias-border-l2, #333)' }}>
          <ConfigForm
            schema={DEMO_SCHEMA}
            values={demoFormValues as any}
            onChange={patch => {
              setDemoFormValues(prev => ({ ...prev, ...patch }))
              props.notify('ConfigForm 字段已变更', { tone: 'info', timeoutMs: 1500 })
            }}
          />
        </div>
      </Section>

      {/* Section 4: Fabric v0.2.0 Overlay Primitives */}
      <Section
        title="Fabric 浮层与交互基座 (Overlays & Popovers)"
        description="内置 Modal 模态弹窗、Popover 气泡卡片与 Dropdown 下拉菜单，自适应当前主题"
      >
        <div className={styles.overlayGrid}>
          {/* Modal Demo Card */}
          <div className={styles.overlayCard}>
            <span className={styles.overlayCardTitle}>Modal 模态对话框</span>
            <p className={styles.overlayCardDesc}>
              支持 ESC 快捷关闭、遮罩点击、尺寸调节与规范 Z-Index 聚焦层级 (1000)
            </p>
            <div className={styles.overlayActionRow}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => {
                  setDemoModalSize('md')
                  setDemoModalOpen(true)
                }}
              >
                打开标准 Modal (md)
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => {
                  setDemoModalSize('sm')
                  setDemoModalOpen(true)
                }}
              >
                小弹窗 (sm)
              </button>
              <button
                type="button"
                className={styles.btnOutline}
                onClick={() => {
                  setDemoModalSize('lg')
                  setDemoModalOpen(true)
                }}
              >
                大弹窗 (lg)
              </button>
            </div>
          </div>

          {/* Popover Demo Card */}
          <div className={styles.overlayCard}>
            <span className={styles.overlayCardTitle}>Popover 气泡浮层</span>
            <p className={styles.overlayCardDesc}>
              基于浮层锚点计算，支持 top / bottom / left / right 四向弹出与外部点击关闭
            </p>
            <div className={styles.overlayActionRow}>
              <Popover
                placement={popoverPlacement}
                trigger={
                  <button type="button" className={styles.btnSecondary}>
                    点击展开 Popover ({popoverPlacement}) ▾
                  </button>
                }
                content={
                  <div style={{ padding: '12px', minWidth: '200px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '13px' }}>
                      Popover 浮层内容
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', marginBottom: '8px' }}>
                      当前生效的主题主色：<span style={{ color: activeTheme.tokens.brand.brandPrimary }}>{activeTheme.tokens.brand.brandPrimary}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(['top', 'bottom', 'left', 'right'] as const).map(pos => (
                        <button
                          key={pos}
                          type="button"
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--dsw-alias-border-l2)',
                            background: popoverPlacement === pos ? 'var(--dsw-alias-brand-primary)' : 'transparent',
                            color: popoverPlacement === pos ? '#fff' : 'inherit',
                          }}
                          onClick={() => setPopoverPlacement(pos)}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                }
              />
            </div>
          </div>

          {/* Dropdown Demo Card */}
          <div className={styles.overlayCard}>
            <span className={styles.overlayCardTitle}>Dropdown 动作下拉菜单</span>
            <p className={styles.overlayCardDesc}>
              支持常规动作、Danger 警示项、禁用项及全局键盘导航
            </p>
            <div className={styles.overlayActionRow}>
              <Dropdown
                trigger={
                  <button type="button" className={styles.btnPrimary}>
                    操作菜单 (Dropdown) ▾
                  </button>
                }
                items={dropdownDemoItems}
                placement="bottom"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Section 5: Z-Index and Design Tokens Reference */}
      <Section
        title="Fabric 设计系统分层规范 (Z-Index Hierarchy)"
        description="框架内置标准层级常量，杜绝下游插件间的层级冲突"
      >
        <div className={styles.zIndexTableWrapper}>
          <div className={styles.zIndexGrid}>
            <div className={styles.zIndexRow}>
              <span className={styles.zIndexName}>BASE</span>
              <span className={styles.zIndexVal}>{Z_INDEX.BASE}</span>
              <span className={styles.zIndexDesc}>页面基础内容与卡片</span>
            </div>
            <div className={styles.zIndexRow}>
              <span className={styles.zIndexName}>STICKY</span>
              <span className={styles.zIndexVal}>{Z_INDEX.STICKY}</span>
              <span className={styles.zIndexDesc}>粘性吸顶栏 / 导航栏</span>
            </div>
            <div className={styles.zIndexRow}>
              <span className={styles.zIndexName}>DROPDOWN</span>
              <span className={styles.zIndexVal}>{Z_INDEX.DROPDOWN}</span>
              <span className={styles.zIndexDesc}>下拉菜单选项列表</span>
            </div>
            <div className={styles.zIndexRow}>
              <span className={styles.zIndexName}>POPOVER</span>
              <span className={styles.zIndexVal}>{Z_INDEX.POPOVER}</span>
              <span className={styles.zIndexDesc}>气泡卡片与提示浮层</span>
            </div>
            <div className={styles.zIndexRow}>
              <span className={styles.zIndexName}>DRAWER</span>
              <span className={styles.zIndexVal}>{Z_INDEX.DRAWER}</span>
              <span className={styles.zIndexDesc}>侧边滑出抽屉</span>
            </div>
            <div className={styles.zIndexRow}>
              <span className={styles.zIndexName}>OVERLAY</span>
              <span className={styles.zIndexVal}>{Z_INDEX.OVERLAY}</span>
              <span className={styles.zIndexDesc}>全局覆盖层与 HUD 悬浮球</span>
            </div>
            <div className={styles.zIndexRow}>
              <span className={styles.zIndexName}>MODAL</span>
              <span className={styles.zIndexVal}>{Z_INDEX.MODAL}</span>
              <span className={styles.zIndexDesc}>模态弹窗与遮罩</span>
            </div>
            <div className={styles.zIndexRow}>
              <span className={styles.zIndexName}>TOAST</span>
              <span className={styles.zIndexVal}>{Z_INDEX.TOAST}</span>
              <span className={styles.zIndexDesc}>全局通知消息栈</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Section 6: Fabric Badges */}
      <Section title="Fabric 徽标状态阶梯 (Badges)" description="五种语义色阶在当前主题下的对比表现">
        <div className={styles.badgeMatrix}>
          <div className={styles.badgeItem}>
            <Badge tone="neutral">Neutral 中性</Badge>
            <span className={styles.badgeHint}>常规标识 / 计数</span>
          </div>
          <div className={styles.badgeItem}>
            <Badge tone="info">Info 信息</Badge>
            <span className={styles.badgeHint}>状态提示 / 版本</span>
          </div>
          <div className={styles.badgeItem}>
            <Badge tone="success">Success 成功</Badge>
            <span className={styles.badgeHint}>运行正常 / 完成</span>
          </div>
          <div className={styles.badgeItem}>
            <Badge tone="warning">Warning 警告</Badge>
            <span className={styles.badgeHint}>注意检查 / 待处理</span>
          </div>
          <div className={styles.badgeItem}>
            <Badge tone="error">Error 错误</Badge>
            <span className={styles.badgeHint}>异常中断 / 失败</span>
          </div>
        </div>
      </Section>

      {/* Section 7: Buttons and Action Controls */}
      <Section title="按钮与工具栏动作 (Buttons & Actions)" description="各级操作按钮与悬停反馈">
        <div className={styles.buttonMatrix}>
          <button type="button" className={styles.btnPrimary}>
            主要品牌操作 (Primary)
          </button>
          <button type="button" className={styles.btnSecondary}>
            次级操作 (Secondary)
          </button>
          <button type="button" className={styles.btnOutline}>
            线框轮廓按钮 (Outline)
          </button>
          <button type="button" className={styles.btnDanger}>
            危险操作 (Danger)
          </button>
          <button type="button" disabled className={styles.btnDisabled}>
            禁用状态 (Disabled)
          </button>
        </div>
      </Section>

      {/* Section 8: Interactive Forms */}
      <Section title="表单交互控件 (Form Controls)" description="输入框、滑块与复选框">
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>文本输入框 (Input)</label>
            <input
              type="text"
              className={styles.fieldInput}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>滑块调节器 (Slider: {sliderVal}%)</label>
            <input
              type="range"
              min={0}
              max={100}
              className={styles.fieldSlider}
              value={sliderVal}
              onChange={e => setSliderVal(Number(e.target.value))}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>开关状态 (Toggle)</label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={toggleChecked}
                onChange={e => setToggleChecked(e.target.checked)}
              />
              <span style={{ color: 'var(--dsw-alias-label-primary)' }}>
                {toggleChecked ? '已启用自动主题同步' : '已禁用'}
              </span>
            </label>
          </div>
        </div>
      </Section>

      {/* Section 9: Toast Notifications */}
      <Section title="通知消息反馈 (Toast Notifications)" description="触发全局悬浮通知">
        <div className={styles.toastTriggerRow}>
          <button
            type="button"
            className={styles.btnToastInfo}
            onClick={() => triggerToast('info')}
          >
            触发 Info 通知
          </button>
          <button
            type="button"
            className={styles.btnToastSuccess}
            onClick={() => triggerToast('success')}
          >
            触发 Success 通知
          </button>
          <button
            type="button"
            className={styles.btnToastWarning}
            onClick={() => triggerToast('warning')}
          >
            触发 Warning 通知
          </button>
          <button
            type="button"
            className={styles.btnToastError}
            onClick={() => triggerToast('error')}
          >
            触发 Error 通知
          </button>
        </div>
      </Section>

      {/* Section 10: Async Lifecycle States */}
      <Section
        title="异步生命周期状态 (Async States)"
        description="加载中、空列表与错误回退视图"
        actions={
          <div className={styles.tabGroup}>
            {(['loaded', 'loading', 'empty', 'error'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                className={`${styles.tabBtn} ${asyncMode === mode ? styles.tabBtnActive : ''}`}
                onClick={() => setAsyncMode(mode)}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        }
      >
        <div className={styles.asyncContainer}>
          {asyncMode === 'loaded' && (
            <div className={styles.loadedBox}>
              <span className={styles.loadedIcon}>✓</span>
              <span className={styles.loadedText}>
                数据已成功装载完毕，当前展示常规内容视图（AsyncView State: Ready）
              </span>
            </div>
          )}
          {asyncMode === 'loading' && <LoadingState label="正在载入主题全景展台资源..." />}
          {asyncMode === 'empty' && (
            <EmptyState
              title="暂无可展示的列表数据"
              description="当前目录下为空，您可以尝试刷新或新增数据条目"
              action={
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => setAsyncMode('loaded')}
                >
                  重载数据
                </button>
              }
            />
          )}
          {asyncMode === 'error' && (
            <ErrorState
              error="NetworkTimeoutError: 获取远程主题数据超时 (504 Gateway Timeout)"
              retry={() => setAsyncMode('loaded')}
              retryLabel="重新连接"
            />
          )}
        </div>
      </Section>

      {/* Demo Modal Instance */}
      <Modal
        open={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        size={demoModalSize}
        title={`Fabric Modal 弹窗示例 (${demoModalSize.toUpperCase()})`}
        description="展示由 Fabric 提供的标准模态对话框容器"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setDemoModalOpen(false)}
            >
              取消
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                setDemoModalOpen(false)
                props.notify('已确认 Modal 操作', { tone: 'success' })
              }}
            >
              确认提交
            </button>
          </div>
        }
      >
        <div style={{ color: 'var(--dsw-alias-label-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
          <p>
            当前弹窗尺寸为 <strong>{demoModalSize}</strong>。
          </p>
          <p>
            此弹窗完全由 Fabric 框架统一调度，具备自适应 ESC 键盘关闭、遮罩模糊、焦点捕获以及与当前主题 Token 深度同构的特性。
          </p>
        </div>
      </Modal>
    </Page>
  )
}
