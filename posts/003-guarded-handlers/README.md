# Guards para handlers no frontend

**Afirmação central:** quando a mesma pré-condição de interação se repete em diferentes ações, tratá-la como um guard composável pode tornar os handlers menores, as políticas mais consistentes e os testes mais localizados. Para uma condição específica e local, um `if` continua sendo a solução mais simples.

**Estado:** rascunho
**Artigo:** `post/post.md` será escrito após a implementação e a análise do lab.
**Contrato em discussão:** [`docs/contract.md`](docs/contract.md)
**Decisão em avaliação:** [`docs/guarded-result.md`](docs/guarded-result.md)

## O que este repositório pretende demonstrar

O lab colocará lado a lado uma implementação com condicionais dentro dos handlers e outra com guards composáveis. O mesmo conjunto de ações deverá permitir inspecionar:

- onde ficam confirmação, conectividade e controle de acesso na implementação direta;
- como essas pré-condições são reutilizadas e ordenadas na implementação com guards;
- como uma condição interrompe a cadeia sem executar as etapas seguintes;
- como argumentos, retorno e erros atravessam a composição;
- quais testes pertencem à ação e quais pertencem às políticas compartilhadas.

## O que ele não pretende provar

- Guards no frontend não são uma fronteira de segurança e não substituem autorização ou validação no backend.
- Menos código em um handler não implica automaticamente melhor manutenção ou produtividade.
- Uma condição local não se torna melhor apenas por ser extraída para uma abstração.
- O padrão não deve ser adotado como requisito para todo event handler.

## Como reproduzir

```bash
cd lab
npm install
npm run typecheck
npm test
```

Para gerar o vídeo do LinkedIn (`post/assets/reel-003.mp4`, 1080×1350, 30 s) com a skill `lab-reel`, a partir do roteiro em `post/reel-brief.md`:

```bash
npm run reel:check    # duração, seletores, layout e colisões
npm run reel:sheet    # folha de contato em lab/.reel/sheet.png
npm run reel:render   # MP4 + capa em post/assets/
```

## Resultados iniciais

- O núcleo puro, a factory e o hook compilam sem casts.
- O retorno do handler é inferido e preservado dentro de `GuardedResult`.
- Os 24 testes cobrem ordem, short-circuit, argumentos, retorno, condições e efeitos assíncronos, propagação de erros, closures atualizadas, identidade com dependências estáveis, narrowing de `GuardedResult`, estados da demo e navegação pelas comparações.
- A avaliação inicial mantém `GuardedResult` provisoriamente na interface pública; a decisão está documentada em `docs/guarded-result.md`.
- A demo interativa permite bloquear cada guard isoladamente e inspecionar a ordem real da execução.
- A comparação mostra o mesmo caso de uso com guards, early returns e código monolítico, além dos adapters React, Angular e Vue.
