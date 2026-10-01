// @ts-check
import { defineConfig } from 'astro/config'
import { unified } from '@astrojs/markdown-remark'
import sitemap from '@astrojs/sitemap'
import expressiveCode from 'astro-expressive-code'
import { rehypeRepoLinks } from './src/lib/rehype-repo-links.mjs'
import { rehypeTables } from './src/lib/rehype-tables.mjs'

export default defineConfig({
  site: 'https://lab.synko.digital',
  // Cloudflare Pages serve pasta/index.html em /pasta/ (com barra)
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  integrations: [
    expressiveCode({
      themes: ['vitesse-dark'],
      useDarkModeMediaQuery: false,
      // Trechos completos quebram linha em vez de rolar na horizontal.
      defaultProps: { wrap: true, preserveIndent: true },
      styleOverrides: {
        borderRadius: '12px',
        borderColor: 'var(--code-border)',
        codeFontFamily: "'Geist Mono Variable', ui-monospace, monospace",
        codeFontSize: '0.84rem',
        codeLineHeight: '1.7',
        codeBackground: 'var(--code-bg)',
        uiFontFamily: "'Geist Mono Variable', ui-monospace, monospace",
        uiFontSize: '0.72rem',
        frames: {
          editorBackground: 'var(--code-bg)',
          editorTabBarBackground: 'var(--code-bar)',
          editorActiveTabBackground: 'var(--code-bar)',
          editorActiveTabForeground: 'var(--code-meta)',
          editorActiveTabIndicatorTopColor: 'transparent',
          editorActiveTabIndicatorBottomColor: 'transparent',
          editorTabBarBorderBottomColor: 'var(--code-border)',
          terminalBackground: 'var(--code-bg)',
          terminalTitlebarBackground: 'var(--code-bar)',
          terminalTitlebarForeground: 'var(--code-meta)',
          terminalTitlebarBorderBottomColor: 'var(--code-border)',
          terminalTitlebarDotsOpacity: '0',
          frameBoxShadowCssValue: 'none',
          inlineButtonForeground: 'var(--code-meta)',
          inlineButtonBorder: 'var(--code-border)',
          tooltipSuccessBackground: 'var(--spark)',
          tooltipSuccessForeground: '#1e1b18',
        },
      },
    }),
    sitemap({
      i18n: { defaultLocale: 'pt-br', locales: { 'pt-br': 'pt-BR', en: 'en-US' } },
    }),
  ],
  markdown: {
    processor: unified({
      rehypePlugins: [rehypeRepoLinks, rehypeTables],
    }),
  },
  vite: {
    // o conteúdo vem de ../posts (ver docs/conventions.md, "Exceção: site/")
    server: { fs: { allow: ['..'] } },
  },
})
