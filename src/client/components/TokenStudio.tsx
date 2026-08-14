import { useEffect, useState } from 'react'
import type { FabricPageProps } from 'fabric/client'
import { Badge, Page, PageHeader, Section, ToolbarButton } from 'fabric/ui'
import type { ThemeCategory, ThemeDefinition, ThemeTokens } from '../../types.ts'
import { calculateContrastRatio, evaluateContrastGrade, useThemeStudio } from '../theme-engine.ts'
import styles from '../styles/studio.module.css'

export function TokenStudio(props: FabricPageProps) {
  const { activeTheme, saveCustomTheme, applyCustomThemeDraft, resetAll } = useThemeStudio()
  const [draft, setDraft] = useState<ThemeDefinition>(() => JSON.parse(JSON.stringify(activeTheme)))
  const [saveName, setSaveName] = useState<string>('')
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false)

  // Sync draft when active theme changes from outside
  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(activeTheme)))
  }, [activeTheme.id])

  const contrastRatio = calculateContrastRatio(draft.tokens.background.bgBase, draft.tokens.text.textPrimary)
  const contrastGrade = evaluateContrastGrade(contrastRatio)

  const updateToken = <K extends keyof ThemeTokens>(group: K, key: keyof ThemeTokens[K], value: string) => {
    setDraft(prev => {
      const next: ThemeDefinition = {
        ...prev,
        tokens: {
          ...prev.tokens,
          [group]: {
            ...prev.tokens[group],
            [key]: value,
          },
        },
      }
      applyCustomThemeDraft(next)
      return next
    })
  }

  const handleSave = () => {
    const finalName = saveName.trim() === '' ? `${draft.name} (Custom)` : saveName.trim()
    const id = `custom-${Date.now()}`
    const themeToSave: ThemeDefinition = {
      ...draft,
      id,
      name: finalName,
      isBuiltin: false,
      author: 'User',
      description: `基于 ${draft.name} 定制的个性化主题`,
      contrastRating: contrastGrade,
    }
    saveCustomTheme(themeToSave)
    setShowSaveModal(false)
    setSaveName('')
    props.notify(`自定义主题「${finalName}」已成功保存并应用`, { tone: 'success' })
  }

  const handleCopyCss = () => {
    const cssVars = Object.entries(draft.tokens.background)
      .map(([k, v]) => `  --dsw-color-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`)
      .concat(
        Object.entries(draft.tokens.text).map(
          ([k, v]) => `  --dsw-color-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`,
        ),
      )
      .concat(
        Object.entries(draft.tokens.brand).map(
          ([k, v]) => `  --dsw-color-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`,
        ),
      )
      .concat(
        Object.entries(draft.tokens.status).map(
          ([k, v]) => `  --dsw-color-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`,
        ),
      )
      .join('\n')

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(`:root {\n${cssVars}\n}`)
      props.notify('CSS 变量已复制到剪贴板', { tone: 'info' })
    }
  }

  const handleResetDraft = () => {
    const original = JSON.parse(JSON.stringify(activeTheme)) as ThemeDefinition
    setDraft(original)
    applyCustomThemeDraft(original)
    props.notify('已重置当前未保存的微调', { tone: 'info' })
  }

  return (
    <Page className={styles.studioPage ?? ''}>
      <PageHeader
        title="调色盘 (Token Studio)"
        description="交互式调节 DSH 与 Fabric 语义设计变量，实时观察全局渲染变化"
        actions={
          <div className={styles.headerActions}>
            <ToolbarButton
              label="复制 CSS"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              }
              onClick={handleCopyCss}
            />
            <ToolbarButton
              label="重置微调"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              }
              onClick={handleResetDraft}
            />
            <button
              type="button"
              className={styles.btnSavePrimary}
              onClick={() => setShowSaveModal(true)}
            >
              保存为新主题
            </button>
          </div>
        }
      />

      <div className={styles.studioLayout}>
        {/* Left Column: Token Editors */}
        <div className={styles.editorColumn}>
          {/* Section: Base Properties */}
          <Section title="主题元信息" description="设置主题的基础分类与描述">
            <div className={styles.formRow}>
              <label className={styles.fieldLabel}>主题名称</label>
              <input
                type="text"
                className={styles.textInput}
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.fieldLabel}>色彩分类</label>
              <select
                className={styles.selectInput}
                value={draft.category}
                onChange={e => setDraft(d => ({ ...d, category: e.target.value as ThemeCategory }))}
              >
                <option value="dark">深色 (Dark)</option>
                <option value="light">浅色 (Light)</option>
                <option value="special">特色 (Special)</option>
              </select>
            </div>
          </Section>

          {/* Section: Background & Surfaces */}
          <Section title="背景与容器表面 (Backgrounds)" description="控制底色、浮层与卡片表面的阶梯明度">
            <div className={styles.tokenGrid}>
              {[
                { label: '基础底色 (bgBase)', key: 'bgBase' as const },
                { label: '提升层级 (bgElevated)', key: 'bgElevated' as const },
                { label: '次级微弱底色 (bgSubtle)', key: 'bgSubtle' as const },
                { label: '卡片表面 (bgSurface)', key: 'bgSurface' as const },
                { label: '下沉凹陷区 (bgSunken)', key: 'bgSunken' as const },
              ].map(item => (
                <div key={item.key} className={styles.colorField}>
                  <span className={styles.colorLabel}>{item.label}</span>
                  <div className={styles.colorInputGroup}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={draft.tokens.background[item.key].startsWith('#') ? draft.tokens.background[item.key] : '#222222'}
                      onChange={e => updateToken('background', item.key, e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={draft.tokens.background[item.key]}
                      onChange={e => updateToken('background', item.key, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Section: Typography */}
          <Section title="文本阶梯 (Typography)" description="各级正文、副标、辅助与禁用文字色彩">
            <div className={styles.tokenGrid}>
              {[
                { label: '主要文本 (textPrimary)', key: 'textPrimary' as const },
                { label: '次要文本 (textSecondary)', key: 'textSecondary' as const },
                { label: '辅助弱化文本 (textTertiary)', key: 'textTertiary' as const },
                { label: '禁用文本 (textDisabled)', key: 'textDisabled' as const },
              ].map(item => (
                <div key={item.key} className={styles.colorField}>
                  <span className={styles.colorLabel}>{item.label}</span>
                  <div className={styles.colorInputGroup}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={draft.tokens.text[item.key].startsWith('#') ? draft.tokens.text[item.key] : '#ffffff'}
                      onChange={e => updateToken('text', item.key, e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={draft.tokens.text[item.key]}
                      onChange={e => updateToken('text', item.key, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Section: Brand & Accent */}
          <Section title="品牌与重点色 (Brand & Accent)" description="主按钮、活动指示器与发光高亮">
            <div className={styles.tokenGrid}>
              {[
                { label: '品牌主色 (brandPrimary)', key: 'brandPrimary' as const },
                { label: '品牌悬停色 (brandHover)', key: 'brandHover' as const },
                { label: '强调色 (accentPrimary)', key: 'accentPrimary' as const },
                { label: '强调色悬停 (accentHover)', key: 'accentHover' as const },
              ].map(item => (
                <div key={item.key} className={styles.colorField}>
                  <span className={styles.colorLabel}>{item.label}</span>
                  <div className={styles.colorInputGroup}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={
                        item.key.startsWith('brand')
                          ? (draft.tokens.brand[item.key as keyof typeof draft.tokens.brand].startsWith('#')
                            ? draft.tokens.brand[item.key as keyof typeof draft.tokens.brand]
                            : '#4176e6')
                          : (draft.tokens.accent[item.key as keyof typeof draft.tokens.accent].startsWith('#')
                            ? draft.tokens.accent[item.key as keyof typeof draft.tokens.accent]
                            : '#60a5fa')
                      }
                      onChange={e => {
                        if (item.key.startsWith('brand')) {
                          updateToken('brand', item.key as any, e.target.value)
                        } else {
                          updateToken('accent', item.key as any, e.target.value)
                        }
                      }}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={
                        item.key.startsWith('brand')
                          ? draft.tokens.brand[item.key as keyof typeof draft.tokens.brand]
                          : draft.tokens.accent[item.key as keyof typeof draft.tokens.accent]
                      }
                      onChange={e => {
                        if (item.key.startsWith('brand')) {
                          updateToken('brand', item.key as any, e.target.value)
                        } else {
                          updateToken('accent', item.key as any, e.target.value)
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Section: Status Tones */}
          <Section title="状态指示色 (Status Tones)" description="成功、警告、错误与通知信息色">
            <div className={styles.tokenGrid}>
              {[
                { label: '成功 (Success)', key: 'success' as const },
                { label: '警告 (Warning)', key: 'warning' as const },
                { label: '错误 (Error)', key: 'error' as const },
                { label: '信息 (Info)', key: 'info' as const },
              ].map(item => (
                <div key={item.key} className={styles.colorField}>
                  <span className={styles.colorLabel}>{item.label}</span>
                  <div className={styles.colorInputGroup}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={draft.tokens.status[item.key].startsWith('#') ? draft.tokens.status[item.key] : '#22c55e'}
                      onChange={e => updateToken('status', item.key, e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={draft.tokens.status[item.key]}
                      onChange={e => updateToken('status', item.key, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Section: Shapes & Radii */}
          <Section title="圆角与轮廓 (Shape & Radius)" description="微调交互控件与卡片的边角弧度">
            <div className={styles.tokenGrid}>
              {[
                { label: '小圆角 (radiusSm)', key: 'radiusSm' as const },
                { label: '中圆角 (radiusMd)', key: 'radiusMd' as const },
                { label: '大圆角 (radiusLg)', key: 'radiusLg' as const },
              ].map(item => (
                <div key={item.key} className={styles.formRow}>
                  <label className={styles.fieldLabel}>{item.label}</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    value={draft.tokens.shape[item.key]}
                    onChange={e => updateToken('shape', item.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Right Column: Real-time Live Preview */}
        <div className={styles.previewColumn}>
          <div className={styles.stickyPreview}>
            <h3 className={styles.previewHeading}>实时渲染视图</h3>

            {/* Contrast Meter Card */}
            <div
              className={styles.contrastCard}
              style={{
                backgroundColor: draft.tokens.background.bgElevated,
                borderColor: draft.tokens.border.borderBase,
              }}
            >
              <div className={styles.contrastHeader}>
                <span style={{ color: draft.tokens.text.textSecondary }}>WCAG 2.1 对比度评级</span>
                <Badge tone={contrastGrade === 'AAA' ? 'success' : contrastGrade === 'AA' ? 'info' : 'warning'}>
                  {contrastGrade} ({contrastRatio}:1)
                </Badge>
              </div>
              <p className={styles.contrastText} style={{ color: draft.tokens.text.textTertiary }}>
                {contrastRatio >= 7.0
                  ? '✓ 达到 AAA 顶级无障碍可读性标准'
                  : contrastRatio >= 4.5
                    ? '✓ 达到 AA 标准，常规文本清晰易读'
                    : '⚠ 对比度偏低，建议提升文本亮度或加深底色'}
              </p>
            </div>

            {/* Mock Fabric Card Preview */}
            <div
              className={styles.mockCard}
              style={{
                backgroundColor: draft.tokens.background.bgElevated,
                borderColor: draft.tokens.border.borderBase,
                borderRadius: draft.tokens.shape.radiusMd,
                boxShadow: draft.tokens.shape.shadowMd,
              }}
            >
              <div className={styles.mockHeader}>
                <h4 style={{ color: draft.tokens.text.textPrimary }}>{draft.name}</h4>
                <Badge tone="info">Fabric Preview</Badge>
              </div>
              <p style={{ color: draft.tokens.text.textSecondary, fontSize: '13px' }}>
                这是在当前调色盘配置下渲染的卡片示例。实时反映文字阶梯、表面颜色和边框效果。
              </p>

              <div className={styles.mockButtons}>
                <button
                  type="button"
                  className={styles.mockBtnPrimary}
                  style={{
                    backgroundColor: draft.tokens.brand.brandPrimary,
                    borderRadius: draft.tokens.shape.radiusSm,
                    color: '#ffffff',
                  }}
                >
                  主品牌按钮
                </button>
                <button
                  type="button"
                  className={styles.mockBtnSecondary}
                  style={{
                    backgroundColor: draft.tokens.background.bgSurface,
                    color: draft.tokens.text.textPrimary,
                    borderColor: draft.tokens.border.borderBase,
                    borderRadius: draft.tokens.shape.radiusSm,
                  }}
                >
                  次级操作
                </button>
              </div>

              <div className={styles.mockBadgeStrip}>
                <Badge tone="success">运行正常</Badge>
                <Badge tone="warning">待处理</Badge>
                <Badge tone="error">异常告警</Badge>
                <Badge tone="neutral">就绪</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Modal Dialog */}
      {showSaveModal && (
        <div className={styles.modalBackdrop}>
          <div
            className={styles.modalCard}
            style={{
              backgroundColor: draft.tokens.background.bgElevated,
              borderColor: draft.tokens.border.borderFocus,
            }}
          >
            <h3 style={{ color: draft.tokens.text.textPrimary }}>保存为自定义主题</h3>
            <p style={{ color: draft.tokens.text.textSecondary, fontSize: '13px' }}>
              请输入主题名称，保存后将可在「主题工坊」中随时选用或再次编辑。
            </p>
            <input
              type="text"
              placeholder={`例如：${draft.name} (Custom)`}
              className={styles.modalInput}
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalBtnCancel}
                onClick={() => setShowSaveModal(false)}
              >
                取消
              </button>
              <button
                type="button"
                className={styles.modalBtnConfirm}
                style={{ backgroundColor: draft.tokens.brand.brandPrimary, color: '#ffffff' }}
                onClick={handleSave}
              >
                确认保存并激活
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
