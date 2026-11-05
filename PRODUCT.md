# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O Synko Lab atende dois públicos principais, sem hierarquia entre eles:

- outros engenheiros, que precisam compreender, reproduzir e contestar os experimentos;
- recrutadores e lideranças técnicas, que avaliam profundidade de raciocínio, qualidade de execução e capacidade de comunicar decisões de engenharia.

## Product Purpose

O Synko Lab é um laboratório público de produto, design e engenharia. Seus artigos registram investigações, protótipos, decisões e práticas de construção, publicados no blog e adaptados para o LinkedIn.

Seus três objetivos têm o mesmo peso:

- sustentar as afirmações dos posts com materiais adequados à pergunta;
- demonstrar como Jean Diego pensa e toma decisões como engenheiro;
- produzir material educacional que outros profissionais possam examinar e, quando aplicável, reproduzir.

Sucesso significa que uma pessoa consegue entender a pergunta, examinar os materiais e distinguir observação, interpretação e hipótese. Em edições experimentais, também deve conseguir reproduzir o experimento.

## Positioning

Cada edição desenvolve uma pergunta de produto, design ou engenharia e torna seu raciocínio examinável. Os materiais podem ser experimentos medidos, protótipos, exemplos de código, decisões de interface ou padrões de desenvolvimento registrados em skills. Números e benchmarks são usados quando a pergunta pede medição; não são requisitos para publicar uma edição. Fontes, decisões e limitações acompanham cada formato.

## Operating Context

- Cada post vive em `posts/<NNN>-<slug>/` e possui contexto, texto e materiais próprios. Experimento e dados brutos entram quando fizerem parte da investigação.
- O conteúdo nasce como investigação de produto, design ou engenharia, é publicado em versão completa no blog e só então adaptado para o LinkedIn.
- O artigo do blog é a fonte canônica; a versão do LinkedIn pode condensar o argumento, mas não alterar suas evidências ou ressalvas.
- Leitores devem poder consultar os materiais que sustentam o texto. Quando houver lab executável, devem poder rodá-lo localmente e comparar abordagens.
- Cada pasta de post pode escolher sua própria stack e toolchain; não existe dependência obrigatória entre experimentos.

## Capabilities and Constraints

- Toda afirmação quantitativa precisa apontar para código, metodologia e dados brutos versionados.
- Resultados devem registrar o ambiente em que foram produzidos.
- Resultados que contradizem ou enfraquecem a tese também devem ser publicados.
- O experimento deve testar a tese, não ser construído para confirmá-la.
- Linhas de código, bundle size e outras métricas isoladas não podem ser apresentadas como equivalentes diretos de produtividade ou qualidade.
- Limitações, assimetrias metodológicas e decisões de escopo precisam ser explícitas.
- Posts são independentes: duplicação local é preferível a acoplamento entre labs.
- O texto final distingue o que foi observado, o que é interpretação e o que segue em exploração. Em experimentos medidos, implementação, metodologia e dados precisam estar estabilizados antes da conclusão.
- A redação deve ser clara, objetiva e sem preenchimento retórico.

## Brand Commitments

- A identidade pública é Synko Lab, o laboratório de engenharia da Synko (Jean Diego).
- A voz é pessoal, direta, concreta e intelectualmente honesta. O nível de detalhe técnico acompanha o assunto da edição.
- A apresentação deve comunicar publicação técnica e engenharia editorial, não um dashboard genérico ou uma ferramenta de IA.
- A referência visual vinculante é o Synko Brand System v1.0 em `/Users/jeandiego/synko/brand-synko/brand` (`SYNKO_DESIGN_SYSTEM.md`, `foundations/`).
- A identidade evita cores oficiais de frameworks como linguagem dominante; marcas de terceiros podem aparecer apenas como sinais locais e discretos.

## Evidence on Hand

- Convenções do repositório: `docs/conventions.md`.
- Template estrutural de posts: `templates/post-template/`.
- Labs, metodologia, dados e textos: `posts/`.
- Implementação visual de referência aprovada: `posts/002-form-abstractions-dx/lab/`.
- Tokens e compromissos visuais da marca: `/Users/jeandiego/synko/brand-synko/brand/foundations/`.
- Não há autorização para fabricar benchmarks, depoimentos, usuários, resultados ou provas ausentes.

## Product Principles

1. **Evidência antes da afirmação.** Uma conclusão pública precisa ser rastreável até um experimento ou fonte verificável.
2. **Materiais examináveis.** O leitor deve conseguir acompanhar o raciocínio e seus limites; quando houver experimento, também reproduzir o caminho.
3. **Transparência sobre trade-offs.** Custos, exceções, limitações e resultados desfavoráveis fazem parte da entrega.
4. **Independência por post.** Cada investigação deve continuar compreensível e executável sem depender dos outros labs.
5. **Clareza sem simplificação enganosa.** O texto é curto e direto, mas preserva as nuances que mudam a conclusão técnica.

## Accessibility & Inclusion

- Labs web devem ser navegáveis por teclado e preservar semântica nativa sempre que possível.
- Estados de foco, erro, seleção e movimento reduzido precisam ser considerados em superfícies interativas.
- A comunicação não deve pressupor familiaridade com detalhes internos não apresentados no próprio experimento.
