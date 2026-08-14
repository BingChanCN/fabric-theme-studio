import { useState } from 'react'
import type { FabricPageProps } from 'fabric/client'
import {
  Badge,
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
  tokens as fabricTokens,
} from 'fabric/ui'
import { useThemeStudio } from '../theme-engine.ts'
import styles from '../styles/showcase.module.css'

export function ComponentShowcase(props: FabricPageProps) {
  const { activeTheme } = useThemeStudio()
  const [asyncMode, setAsyncMode] = useState<'loaded' | 'loading' | 'empty' | 'error'>('loaded')
  const [inputText, setInputText] = useState('DeepSeek Harness + Fabric v0.2.0')
  const [toggleChecked, setToggleChecked] = useState(true)
  const [sliderVal, setSliderVal] = useState(72)

  // Fabric v0.2.0 Phase 1 Interaction Demos
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
        description="全量呈现 Fabric UI v0.2.0 核心组件、浮层基建 (Modal/Popover/Dropdown) 与交互控件"
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
          </div>
        </div>
      </Section>

      {/* Section 2: Fabric v0.2.0 Overlay Primitives */}
      <Section
        title="Fabric v0.2.0 浮层与交互基座 (Overlays & Popovers)"
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

      {/* Section 3: Z-Index and Design Tokens Reference */}
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

      {/* Section 4: Fabric Badges */}
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

      {/* Section 5: Buttons and Action Controls */}
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

      {/* Section 6: Interactive Forms */}
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

      {/* Section 7: Toast Notifications */}
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

      {/* Section 8: Async Lifecycle States */}
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
        description="展示由 Fabric v0.2.0 提供的标准模态对话框容器"
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
