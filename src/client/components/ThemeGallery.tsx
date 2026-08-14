import { useMemo, useState } from 'react'
import type { FabricPageProps } from 'fabric/client'
import { Badge, EmptyState, Page, PageHeader, Section, ToolbarButton } from 'fabric/ui'
import type { ThemeCategory, ThemeDefinition } from '../../types.ts'
import { calculateContrastRatio, evaluateContrastGrade, useThemeStudio } from '../theme-engine.ts'
import styles from '../styles/gallery.module.css'

export function ThemeGallery(props: FabricPageProps) {
  const { activeThemeId, allThemes, setActiveTheme, deleteCustomTheme, resetAll } = useThemeStudio()
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState<string>('')

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
        title="主题库浏览"
        description="选择适合当前工作环境的色彩主题，支持即时切换与自适应对比度检测"
        actions={
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
              placeholder="搜索主题..."
              className={styles.searchInput}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        }
      >
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
                新建自定义主题
              </button>
            }
          />
        ) : (
          <div className={styles.cardGrid}>
            {filteredThemes.map(theme => {
              const isActive = theme.id === activeThemeId
              const contrastRatio = calculateContrastRatio(
                theme.tokens.background.bgBase,
                theme.tokens.text.textPrimary,
              )
              const contrastGrade = evaluateContrastGrade(contrastRatio)
              const toneForGrade = contrastGrade === 'AAA' ? 'success' : contrastGrade === 'AA' ? 'info' : 'warning'

              return (
                <div
                  key={theme.id}
                  className={`${styles.themeCard} ${isActive ? styles.themeCardActive : ''}`}
                  style={{
                    backgroundColor: theme.tokens.background.bgElevated,
                    borderColor: isActive ? theme.tokens.brand.brandPrimary : theme.tokens.border.borderBase,
                  }}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleArea}>
                      <h3 className={styles.cardTitle} style={{ color: theme.tokens.text.textPrimary }}>
                        {theme.name}
                      </h3>
                      <div className={styles.badges}>
                        <Badge tone={theme.category === 'light' ? 'neutral' : 'info'}>
                          {theme.category === 'light' ? '浅色' : theme.category === 'dark' ? '深色' : '特色'}
                        </Badge>
                        <Badge tone={toneForGrade}>
                          {contrastGrade} ({contrastRatio}:1)
                        </Badge>
                        {theme.isBuiltin ? (
                          <Badge tone="neutral">官方内置</Badge>
                        ) : (
                          <Badge tone="success">用户自定义</Badge>
                        )}
                      </div>
                    </div>
                    {isActive && (
                      <span className={styles.activePill} style={{ backgroundColor: theme.tokens.brand.brandPrimary }}>
                        当前生效
                      </span>
                    )}
                  </div>

                  <p className={styles.cardDesc} style={{ color: theme.tokens.text.textSecondary }}>
                    {theme.description}
                  </p>

                  <div className={styles.paletteStrip}>
                    <div
                      className={styles.colorDot}
                      title={`Brand: ${theme.tokens.brand.brandPrimary}`}
                      style={{ backgroundColor: theme.tokens.brand.brandPrimary }}
                    />
                    <div
                      className={styles.colorDot}
                      title={`Accent: ${theme.tokens.accent.accentPrimary}`}
                      style={{ backgroundColor: theme.tokens.accent.accentPrimary }}
                    />
                    <div
                      className={styles.colorDot}
                      title={`Base BG: ${theme.tokens.background.bgBase}`}
                      style={{ backgroundColor: theme.tokens.background.bgBase }}
                    />
                    <div
                      className={styles.colorDot}
                      title={`Elevated BG: ${theme.tokens.background.bgElevated}`}
                      style={{ backgroundColor: theme.tokens.background.bgElevated }}
                    />
                    <div
                      className={styles.colorDot}
                      title={`Primary Text: ${theme.tokens.text.textPrimary}`}
                      style={{ backgroundColor: theme.tokens.text.textPrimary }}
                    />
                  </div>

                  <div className={styles.cardFooter}>
                    <button
                      type="button"
                      disabled={isActive}
                      className={isActive ? styles.btnDisabled : styles.btnApply}
                      style={{
                        backgroundColor: isActive ? 'transparent' : theme.tokens.brand.brandPrimary,
                        color: isActive ? theme.tokens.text.textDisabled : '#ffffff',
                      }}
                      onClick={() => handleApply(theme)}
                    >
                      {isActive ? '已激活' : '应用主题'}
                    </button>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      style={{
                        color: theme.tokens.text.textSecondary,
                        borderColor: theme.tokens.border.borderBase,
                      }}
                      onClick={() => handleCustomize(theme)}
                    >
                      调色微调
                    </button>
                    {!theme.isBuiltin && (
                      <button
                        type="button"
                        className={styles.btnDanger}
                        title="删除此自定义主题"
                        onClick={() => handleDelete(theme)}
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </Page>
  )
}
