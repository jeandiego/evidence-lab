# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O Evidence Lab atende dois públicos principais, sem hierarquia entre eles:

- outros engenheiros, que precisam compreender, reproduzir e contestar os experimentos;
- recrutadores e lideranças técnicas, que avaliam profundidade de raciocínio, qualidade de execução e capacidade de comunicar decisões de engenharia.

## Product Purpose

O Evidence Lab é um laboratório público de engenharia e o repositório de evidências dos artigos publicados no blog e adaptados para o LinkedIn.

Seus três objetivos têm o mesmo peso:

- sustentar tecnicamente as afirmações dos posts;
- demonstrar como Jean Diego pensa e toma decisões como engenheiro;
- produzir material educacional reproduzível para outros profissionais.

Sucesso significa que uma pessoa consegue entender a tese, inspecionar a implementação, reproduzir o experimento e distinguir evidência de interpretação.

## Positioning

Cada publicação conecta uma tese curta a código executável, metodologia explícita, dados brutos e limitações documentadas. O conteúdo não usa um laboratório como decoração: o laboratório existe para testar a afirmação e permanece disponível para inspeção.

## Operating Context

- Cada post vive em `posts/<NNN>-<slug>/` e possui contexto, texto, experimento e evidências próprios.
- O conteúdo nasce como investigação técnica, é publicado em versão completa no blog e só então adaptado para o LinkedIn.
- O artigo do blog é a fonte canônica; a versão do LinkedIn pode condensar o argumento, mas não alterar suas evidências ou ressalvas.
- Leitores devem poder executar o lab localmente, comparar abordagens e consultar os artefatos que sustentam as conclusões.
- Cada pasta de post pode escolher sua própria stack e toolchain; não existe dependência obrigatória entre experimentos.

## Capabilities and Constraints

- Toda afirmação quantitativa precisa apontar para código, metodologia e dados brutos versionados.
- Resultados devem registrar o ambiente em que foram produzidos.
- Resultados que contradizem ou enfraquecem a tese também devem ser publicados.
- O experimento deve testar a tese, não ser construído para confirmá-la.
- Linhas de código, bundle size e outras métricas isoladas não podem ser apresentadas como equivalentes diretos de produtividade ou qualidade.
- Limitações, assimetrias metodológicas e decisões de escopo precisam ser explícitas.
- Posts são independentes: duplicação local é preferível a acoplamento entre labs.
- O texto final só é escrito depois que implementação, metodologia e evidências estão estabilizadas.
- A redação deve ser clara, objetiva e sem preenchimento retórico.

## Brand Commitments

- A identidade pública é Evidence Lab, alinhada à marca pessoal Synko/Jean Diego.
- A voz é técnica, direta, segura e intelectualmente honesta.
- A apresentação deve comunicar publicação técnica e engenharia editorial, não um dashboard genérico ou uma ferramenta de IA.
- A referência visual vinculante existente está em `/Users/jeandiego/Dev/synko-lp/app/globals.css`.
- A identidade evita cores oficiais de frameworks como linguagem dominante; marcas de terceiros podem aparecer apenas como sinais locais e discretos.

## Evidence on Hand

- Convenções do repositório: `docs/conventions.md`.
- Template estrutural de posts: `templates/post-template/`.
- Labs, metodologia, dados e textos: `posts/`.
- Implementação visual de referência aprovada: `posts/002-form-abstractions-dx/lab/`.
- Tokens e compromissos visuais da marca: `/Users/jeandiego/Dev/synko-lp/app/globals.css`.
- Não há autorização para fabricar benchmarks, depoimentos, usuários, resultados ou provas ausentes.

## Product Principles

1. **Evidência antes da afirmação.** Uma conclusão pública precisa ser rastreável até um experimento ou fonte verificável.
2. **Reprodução antes da persuasão.** O leitor deve conseguir repetir o caminho, não apenas aceitar o resultado.
3. **Transparência sobre trade-offs.** Custos, exceções, limitações e resultados desfavoráveis fazem parte da entrega.
4. **Independência por post.** Cada investigação deve continuar compreensível e executável sem depender dos outros labs.
5. **Clareza sem simplificação enganosa.** O texto é curto e direto, mas preserva as nuances que mudam a conclusão técnica.

## Accessibility & Inclusion

- Labs web devem ser navegáveis por teclado e preservar semântica nativa sempre que possível.
- Estados de foco, erro, seleção e movimento reduzido precisam ser considerados em superfícies interativas.
- A comunicação não deve pressupor familiaridade com detalhes internos não apresentados no próprio experimento.
