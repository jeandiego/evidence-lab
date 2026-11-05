export const LANGS = ['pt-br', 'en'] as const
export type Lang = (typeof LANGS)[number]
export const DEFAULT_LANG: Lang = 'pt-br'

export const htmlLang: Record<Lang, string> = { 'pt-br': 'pt-BR', en: 'en-US' }

const strings = {
  'pt-br': {
    siteDescription:
      'Produto, design e engenharia no laboratório público de Jean Diego. Experimentos, protótipos e decisões documentadas.',
    intro: 'Um laboratório público para explorar como produtos são construídos e como decisões de engenharia tomam forma.',
    work: 'Work',
    edition: 'Edição',
    editions: 'Edições',
    latest: 'Edição mais recente',
    read: 'Ler a edição',
    thesis: 'Tese',
    published: 'Publicado',
    readingTime: (min: number) => `${min} min de leitura`,
    onThisPage: 'Nesta edição',
    codeAndData: 'Materiais da edição',
    evidence: 'Dados brutos',
    video: 'Vídeo do resultado',
    play: 'Reproduzir o vídeo',
    videoLabel: (n: string) => `Vídeo da edição ${n}`,
    demo: 'Demo interativa',
    openDemo: 'Abrir demo em tela cheia',
    demoLabel: (n: string) => `Demo interativa da edição ${n}`,
    themeToLight: 'Usar tema claro',
    themeToDark: 'Usar tema escuro',
    language: 'Idioma',
    skip: 'Pular para o conteúdo',
    rss: 'RSS',
    source: 'Código-fonte',
    previous: 'Edição anterior',
    next: 'Próxima edição',
    allEditions: 'Todas as edições',
    empty: 'Nenhuma edição publicada ainda.',
    onlyIn: 'Em português',
    footer: 'O laboratório público de engenharia da Synko.',
    links: 'Links',
  },
  en: {
    siteDescription:
      "Product, design and engineering in Jean Diego's public lab. Experiments, prototypes and documented decisions.",
    intro: 'A public lab exploring how products are built and how engineering decisions take shape.',
    work: 'Work',
    edition: 'Issue',
    editions: 'Issues',
    latest: 'Latest issue',
    read: 'Read the issue',
    thesis: 'Thesis',
    published: 'Published',
    readingTime: (min: number) => `${min} min read`,
    onThisPage: 'In this issue',
    codeAndData: 'Issue materials',
    evidence: 'Raw data',
    video: 'Result video',
    play: 'Play the video',
    videoLabel: (n: string) => `Video for issue ${n}`,
    demo: 'Interactive demo',
    openDemo: 'Open demo full screen',
    demoLabel: (n: string) => `Interactive demo for issue ${n}`,
    themeToLight: 'Switch to light theme',
    themeToDark: 'Switch to dark theme',
    language: 'Language',
    skip: 'Skip to content',
    rss: 'RSS',
    source: 'Source code',
    previous: 'Previous issue',
    next: 'Next issue',
    allEditions: 'All issues',
    empty: 'No issues published yet.',
    onlyIn: 'In Portuguese',
    footer: 'The public engineering lab of Synko.',
    links: 'Links',
  },
} as const

export const t = (lang: Lang) => strings[lang]

export const formatDate = (date: Date, lang: Lang) =>
  new Intl.DateTimeFormat(htmlLang[lang], { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
