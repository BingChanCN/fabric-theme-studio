import { useMemo, useState } from 'react'
import type { FabricPageProps } from 'fabric/client'
import { Badge, Dropdown, EmptyState, Modal, Page, PageHeader, Section, ToolbarButton } from 'fabric/ui'
import type { ThemeCategory, ThemeDefinition } from '../../types.ts'
import { calculateContrastRatio, evaluateContrastGrade, useThemeStudio } from '../theme-engine.ts'
import styles from '../styles/gallery.module.css'

export function ThemeGallery(props: FabricPageProps) {
  const { activeThemeId, allThemes, setActiveTheme, deleteCustomTheme, resetAll } = useThemeStudio()
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  const [inspectingTheme, setInspectingTheme] = useState<ThemeDefinition | null>(null)

  const filteredThemes = useMemo(() => {
    return allThemes.filter(t => {
      if (filter === 'dark' && t.category !== 'dark') return false
      if (filter === 'light' && t.category !== 'light') return false
      if (filter === 'special' && t.category !== 'special') return false
      if (filter === 'custom' && t.isBuiltin) return false
      if (search.trim() !== '') {
        const query = search.toLowerCase()
        return t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)
      }
      return true
    })
  }, [allThemes, filter, search])

  const handleApply = (theme: ThemeDefinition) => {
    setActiveTheme(theme.id)
    props.notify(`已激活主题「${theme.name}」`, { tone: 'success' })
  }

  const handleCustomize = (theme: ThemeDefinition) => {
    setActiveTheme(theme.id)
    props.openFabric('theme-studio')
    props.notify(`正在「${theme.name}」基础上进行微调`, { tone: 'info' })
  }

  const handleDelete = (theme: ThemeDefinition) => {
    deleteCustomTheme(theme.id)
    props.notify(`已删除自定义主题「${theme.name}」`, { tone: 'warning' })
  }

  const handleReset = () => {
    resetAll()
    props.notify('已恢复为 DeepSeek Classic 默认主题', { tone: 'info' })
  }

  const handleCopyJson = (theme: ThemeDefinition) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(JSON.stringify(theme, null, 2))
      props.notify(`已复制「${theme.name}」JSON 定义到剪贴板`, { tone: 'info' })
    }
  }

  return (
    <Page className={styles.galleryPage ?? ''}>
      <PageHeader
        title="主题工坊 (Theme Gallery)"
        description="精选多套经典与个性化色彩体系，一键无缝注入 DSH 宿主与 Fabric 扩展组件"
        actions={
          <div className={styles.headerActions}>
            <ToolbarButton
              label="全景展台"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              }
              onClick={() => props.openFabric('component-showcase')}
            />
            <ToolbarButton
              label="重置默认"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              }
              onClick={handleReset}
            />
          </div>
        }
      />

      <Section
        title="主题预设与个性化定制"
        description="选择适合当前工作环境的色彩主题，支持即时切换与自适应对比度检测"
      >
        <div className={styles.filterBar}>
          <div className={styles.categoryTabs}>
            {[
              { id: 'all', label: '全部' },
              { id: 'dark', label: '深色' },
              { id: 'light', label: '浅色' },
              { id: 'special', label: '特色' },
              { id: 'custom', label: '自定义' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.tabBtn} ${filter === tab.id ? styles.tabBtnActive : ''}`}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="搜索主题名称、作者、标签..."
            className={styles.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filteredThemes.length === 0 ? (
          <EmptyState
            title="未找到匹配的主题"
            description="没有符合当前分类或搜索关键词的主题预设，您可以前往调色盘创建全新主题。"
            action={
              <button
                type="button"
                className={styles.actionBtnPrimary}
                onClick={() => props.openFabric('theme-studio')}
              >
                前往调色盘创建 →
              </button>
            }
          />
        ) : (
          <div className={styles.grid}>
            {filteredThemes.map(theme => {
              const isActive = theme.id === activeThemeId
              const ratio = calculateContrastRatio(
                theme.tokens.background.bgBase,
                theme.tokens.text.textPrimary,
              )
              const grade = evaluateContrastGrade(ratio)

              const dropdownItems = [
                {
                  id: 'apply',
                  label: '应用此主题',
                  disabled: isActive,
                  onClick: () => handleApply(theme),
                },
                {
                  id: 'customize',
                  label: '在调色盘微调',
                  onClick: () => handleCustomize(theme),
                },
                {
                  id: 'inspect',
                  label: '查看 JSON 定义',
                  onClick: () => setInspectingTheme(theme),
                },
                {
                  id: 'copy',
                  label: '复制 JSON',
                  onClick: () => handleCopyJson(theme),
                },
                ...(!theme.isBuiltin
                  ? [
                      {
                        id: 'delete',
                        label: '删除自定义主题',
                        danger: true,
                        onClick: () => handleDelete(theme),
                      },
                    ]
                  : []),
              ]

              return (
                <div
                  key={theme.id}
                  className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                  style={{
                    backgroundColor: theme.tokens.background.bgElevated,
                    borderColor: isActive
                      ? theme.tokens.brand.brandPrimary
                      : theme.tokens.border.borderBase,
                    boxShadow: isActive
                      ? `0 0 0 2px ${theme.tokens.brand.brandPrimary}`
                      : theme.tokens.shape.shadowSm,
                  }}
                >
                  {/* Card Header */}
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleGroup}>
                      <span
                        className={styles.cardIndicator}
                        style={{ backgroundColor: theme.tokens.brand.brandPrimary }}
                      />
                      <span
                        className={styles.cardTitle}
                        style={{ color: theme.tokens.text.textPrimary }}
                      >
                        {theme.name}
                      </span>
                    </div>
                    <div className={styles.badgeGroup}>
                      <Badge
                        tone={
                          grade === 'AAA' ? 'success' : grade === 'AA' ? 'info' : 'warning'
                        }
                      >
                        {grade} ({ratio}:1)
                      </Badge>
                      <Badge tone="neutral">{theme.category}</Badge>
                      {theme.material?.backgroundEffect === 'aurora' && (
                        <Badge tone="info">✨ 极光</Badge>
                      )}
                      {theme.material?.backgroundEffect === 'cyber-grid' && (
                        <Badge tone="info">⚡ 赛博网格</Badge>
                      )}
                      {theme.material?.backgroundEffect === 'mesh-gradient' && (
                        <Badge tone="info">🎨 弥散流光</Badge>
                      )}
                      {theme.material?.acrylic && (
                        <Badge tone="neutral">🪟 毛玻璃</Badge>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p
                    className={styles.cardDesc}
                    style={{ color: theme.tokens.text.textSecondary }}
                  >
                    {theme.description}
                  </p>

                  {/* Swatches Visual Strip */}
                  <div className={styles.swatchRow}>
                    <div
                      className={styles.swatch}
                      style={{ backgroundColor: theme.tokens.background.bgBase }}
                      title={`bgBase: ${theme.tokens.background.bgBase}`}
                    />
                    <div
                      className={styles.swatch}
                      style={{ backgroundColor: theme.tokens.background.bgElevated }}
                      title={`bgElevated: ${theme.tokens.background.bgElevated}`}
                    />
                    <div
                      className={styles.swatch}
                      style={{ backgroundColor: theme.tokens.brand.brandPrimary }}
                      title={`brandPrimary: ${theme.tokens.brand.brandPrimary}`}
                    />
                    <div
                      className={styles.swatch}
                      style={{ backgroundColor: theme.tokens.accent.accentPrimary }}
                      title={`accentPrimary: ${theme.tokens.accent.accentPrimary}`}
                    />
                    <div
                      className={styles.swatch}
                      style={{ backgroundColor: theme.tokens.status.success }}
                      title={`success: ${theme.tokens.status.success}`}
                    />
                    <div
                      className={styles.swatch}
                      style={{ backgroundColor: theme.tokens.status.warning }}
                      title={`warning: ${theme.tokens.status.warning}`}
                    />
                    <div
                      className={styles.swatch}
                      style={{ backgroundColor: theme.tokens.status.error }}
                      title={`error: ${theme.tokens.status.error}`}
                    />
                  </div>

                  {/* Card Actions Footer */}
                  <div className={styles.cardFooter}>
                    <div className={styles.footerLeft}>
                      {isActive ? (
                        <span
                          className={styles.activeLabel}
                          style={{ color: theme.tokens.brand.brandPrimary }}
                        >
                          ✓ 当前生效中
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={styles.btnApply}
                          style={{
                            backgroundColor: theme.tokens.brand.brandPrimary,
                            color: '#ffffff',
                          }}
                          onClick={() => handleApply(theme)}
                        >
                          应用主题
                        </button>
                      )}
                    </div>
                    <div className={styles.footerRight}>
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        style={{
                          backgroundColor: theme.tokens.background.bgSurface,
                          color: theme.tokens.text.textSecondary,
                          borderColor: theme.tokens.border.borderSubtle,
                        }}
                        onClick={() => handleCustomize(theme)}
                      >
                        微调
                      </button>
                      <Dropdown
                        trigger={
                          <button
                            type="button"
                            className={styles.btnIconMore}
                            style={{
                              color: theme.tokens.text.textSecondary,
                              backgroundColor: theme.tokens.background.bgSurface,
                              borderColor: theme.tokens.border.borderSubtle,
                            }}
                            title="更多选项"
                          >
                            •••
                          </button>
                        }
                        items={dropdownItems}
                        placement="bottom"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Inspect Theme JSON Modal */}
      <Modal
        open={inspectingTheme !== null}
        onClose={() => setInspectingTheme(null)}
        title={`主题元数据定义：「${inspectingTheme?.name ?? ''}」`}
        description="基于 JSON Schema 的完整主题 Token 数据字典"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => {
                if (inspectingTheme) handleCopyJson(inspectingTheme)
              }}
            >
              复制 JSON
            </button>
            <button
              type="button"
              className={styles.actionBtnPrimary}
              onClick={() => setInspectingTheme(null)}
            >
              关闭
            </button>
          </div>
        }
      >
        <pre
          style={{
            maxHeight: '320px',
            overflowY: 'auto',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            backgroundColor: 'var(--dsw-alias-bg-layer-1, #1e1e24)',
            color: 'var(--dsw-alias-label-primary, #ffffff)',
            border: '1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.1))',
          }}
        >
          {inspectingTheme ? JSON.stringify(inspectingTheme, null, 2) : ''}
        </pre>
      </Modal>
    </Page>
  )
}
