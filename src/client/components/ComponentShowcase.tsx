import { useState } from 'react'
import type { FabricPageProps } from 'fabric/client'
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  Page,
  PageHeader,
  Section,
  ToolbarButton,
} from 'fabric/ui'
import { useThemeStudio } from '../theme-engine.ts'
import styles from '../styles/showcase.module.css'

export function ComponentShowcase(props: FabricPageProps) {
  const { activeTheme } = useThemeStudio()
  const [asyncMode, setAsyncMode] = useState<'loaded' | 'loading' | 'empty' | 'error'>('loaded')
  const [inputText, setInputText] = useState('DeepSeek Harness + Fabric')
  const [toggleChecked, setToggleChecked] = useState(true)
  const [sliderVal, setSliderVal] = useState(68)

  const triggerToast = (tone: 'info' | 'success' | 'warning' | 'error') => {
    const toneLabels = {
      info: '这是一条普通信息通知，展示 Fabric Toast 消息栈',
      success: '恭喜！操作已成功执行，当前主题渲染正常',
      warning: '请注意：检测到配置项有变动，请及时保存',
      error: '错误：模拟的服务端连接异常，请重试',
    }
    props.notify(toneLabels[tone], { tone, timeoutMs: 4000 })
  }

  return (
    <Page className={styles.showcasePage ?? ''}>
      <PageHeader
        title="全景展台 (Component Showcase)"
        description="全量呈现 Fabric UI 核心组件与交互控件在当前个性化主题下的视觉效果"
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

      {/* Section 2: Fabric Badges */}
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

      {/* Section 3: Toolbar Buttons and Action Buttons */}
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

      {/* Section 4: Fabric Async States */}
      <Section
        title="异步视图状态模型 (Async States)"
        description="测试 Fabric 标准加载、空态与错误回退视图"
        actions={
          <div className={styles.stateSwitcher}>
            <span className={styles.switchLabel}>切换状态展示：</span>
            {(['loaded', 'loading', 'empty', 'error'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                className={`${styles.modeBtn} ${asyncMode === mode ? styles.modeBtnActive : ''}`}
                onClick={() => setAsyncMode(mode)}
              >
                {mode === 'loaded' ? '正常就绪' : mode === 'loading' ? '加载中' : mode === 'empty' ? '空数据' : '错误'}
              </button>
            ))}
          </div>
        }
      >
        <div className={styles.asyncContainer}>
          {asyncMode === 'loading' && <LoadingState label="正在加载工作区数据，请稍候..." />}
          {asyncMode === 'empty' && (
            <EmptyState
              title="暂无主题配置数据"
              description="您可以前往调色盘创建全新配色，或者从预设库中载入。"
              action={
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => props.openFabric('theme-studio')}
                >
                  去创建
                </button>
              }
            />
          )}
          {asyncMode === 'error' && (
            <ErrorState
              error="无法连接到远程主题服务：Network Timeout (504)"
              retry={() => setAsyncMode('loaded')}
              retryLabel="重试连接"
            />
          )}
          {asyncMode === 'loaded' && (
            <div className={styles.loadedContent}>
              <p className={styles.loadedText}>
                ✓ 异步资源已就绪，当前视图展示真实渲染数据。
              </p>
              <div className={styles.mockDataTable}>
                <div className={styles.tableHeader}>
                  <span>模块名称</span>
                  <span>版本</span>
                  <span>状态</span>
                  <span>渲染耗时</span>
                </div>
                <div className={styles.tableRow}>
                  <span>fabric/client</span>
                  <span>v0.1.0</span>
                  <Badge tone="success">Mounted</Badge>
                  <span>1.2ms</span>
                </div>
                <div className={styles.tableRow}>
                  <span>fabric/ui</span>
                  <span>v0.1.0</span>
                  <Badge tone="success">Active</Badge>
                  <span>0.8ms</span>
                </div>
                <div className={styles.tableRow}>
                  <span>theme-engine</span>
                  <span>v0.1.0</span>
                  <Badge tone="info">Live</Badge>
                  <span>0.4ms</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Section 5: Notice & Toast Triggers */}
      <Section title="Fabric 消息通知栈 (Notifications)" description="点击按钮触发不同语调的全局浮层 Toast 消息">
        <div className={styles.toastGrid}>
          <button
            type="button"
            className={`${styles.toastTriggerBtn} ${styles.toastInfo}`}
            onClick={() => triggerToast('info')}
          >
            触发 Info 提示
          </button>
          <button
            type="button"
            className={`${styles.toastTriggerBtn} ${styles.toastSuccess}`}
            onClick={() => triggerToast('success')}
          >
            触发 Success 成功
          </button>
          <button
            type="button"
            className={`${styles.toastTriggerBtn} ${styles.toastWarning}`}
            onClick={() => triggerToast('warning')}
          >
            触发 Warning 警告
          </button>
          <button
            type="button"
            className={`${styles.toastTriggerBtn} ${styles.toastError}`}
            onClick={() => triggerToast('error')}
          >
            触发 Error 错误
          </button>
        </div>
      </Section>

      {/* Section 6: Form Controls & Inputs */}
      <Section title="表单输入与控件 (Form Controls)" description="测试输入框、开关与滑块在不同主题下的对比度与焦点态">
        <div className={styles.formGrid}>
          <div className={styles.formItem}>
            <label className={styles.inputLabel}>文本输入框 (Text Input)</label>
            <input
              type="text"
              className={styles.textInput}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.inputLabel}>滑块调节器 (Range Slider: {sliderVal}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              className={styles.rangeSlider}
              value={sliderVal}
              onChange={e => setSliderVal(Number(e.target.value))}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.inputLabel}>复选与开关 (Toggles)</label>
            <div className={styles.toggleRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={toggleChecked}
                  onChange={e => setToggleChecked(e.target.checked)}
                />
                启用宿主界面联动渲染
              </label>
            </div>
          </div>
        </div>
      </Section>
    </Page>
  )
}
