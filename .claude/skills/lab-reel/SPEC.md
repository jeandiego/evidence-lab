# Lab Reel — especificação

Versão 1.0 · Synko Lab · 2026-10-01

## 1. Propósito

Transformar a página de um lab em um vídeo vertical curto que conta o resultado do post em **tomadas**. Cada tomada sustenta **uma afirmação** com números medidos e mostra onde, na página real, essa afirmação mora.

O vídeo é uma peça de chamada: condensa o artigo canônico e não altera evidências nem ressalvas (PRODUCT.md).

## 2. Princípios

1. **Afirmação primeiro.** O texto da tomada é a tese daquela parte. A página serve de prova, não de cenário.
2. **Números só por referência.** Todo número vem de `evidence/` via `fact()` e é formatado pelo motor. Um dígito digitado à mão bloqueia a renderização, salvo quando é declarado literal com `lit()`.
3. **Movimento é dado.** Contadores, barras e deltas animam a partir dos valores medidos. Nada se move só para enfeitar.
4. **A página real é o espécime.** O lab roda num iframe, a geometria vem do DOM e a página nunca é redesenhada.
5. **Leitura no celular.** Composição 4:5, tipografia grande, uma ideia por tomada e tempo de leitura garantido.
6. **Ressalva junto ao número.** A linha de fonte carrega o arquivo de evidência e a limitação relevante.

## 3. Vocabulário

| Termo | Significado |
|---|---|
| **Story** | O vídeo inteiro: capa, tomadas e fecho. |
| **Shot** (tomada) | Uma afirmação, com `claim`, `sub`, `readouts`, `marks`, `frame`, `focus` e `source`. |
| **Cover / Closing** | Tomadas sem número. A capa é o primeiro quadro (thumbnail) e o fecho traz a tese. |
| **Specimen** | O recorte da página real, enquadrado por uma câmera. |
| **Fact** | Um valor de `evidence/` com caminho de origem, precisão e unidade. |
| **Readout** | Um mostrador de dados: `count`, `shift` ou `bars`. |
| **Mark** | Uma anotação sobre o espécime: `highlight`, `tag` ou `bracket`. |
| **Swap** | A troca de estado da página (ex.: estratégia ativa) feita sob o obturador. |

## 4. Composição (1080 × 1350)

Margem lateral de 48. Coordenadas em px do canvas.

| Zona | y | Conteúdo |
|---|---|---|
| Header | 48–76 | `SYNKO LAB · 002` à esquerda; trilho de progresso + `02/05` à direita |
| Eyebrow | 112–132 | título curto da tomada, mono, vinho |
| Claim | 146–326 | Figtree 300, 54/60, −0,03em, até 3 linhas; facts em vinho |
| Sub | após o claim | Figtree 400, 26/34, cinza quente, até 2 linhas |
| Readouts | 436–600 | colunas de mostradores ou barras |
| Specimen | 624–1258 | cartão 984×634, raio 14, borda pedra |
| Footer | 1282–1306 | fonte (mono, cinza) à esquerda; endereço do lab (mono, vinho) à direita |

## 5. Linguagem visual

Tokens da marca Synko:

| Token | Valor | Uso |
|---|---|---|
| canvas | `#F5F3F1` | fundo do vídeo |
| paper | `#FDFCFC` | cartão do espécime, obturador |
| stone | `#EBE8E4` | bordas, trilhos, barras de referência |
| ink | `#1E1B18` | texto principal |
| quiet | `#514C47` / `#777169` | sub / legendas |
| wine | `#421D24` | facts, tags, contorno de foco, barras principais |
| wine-soft | `#6F2F3A` | segundo segmento de barra |
| spark | `#D48A46` | marca-texto, progresso, ponto de ancoragem, delta |

Tipos: Figtree Variable (texto e números), Geist Mono Variable (legendas, tags, header, fonte).

Componentes do espécime:

- **Véu**: papel quente `#F5F3F1` a 72% sobre tudo fora do foco.
- **Contorno de foco**: vinho, 2 px, raio 10, folga de 8 px, desenhado em traço contínuo.
- **Marca-texto** (`highlight`): faixa spark a 30% atrás das linhas de texto do alvo, varrendo da esquerda para a direita.
- **Tag**: pílula vinho (ou spark sobre fundo escuro) com texto mono maiúsculo de 16 px, ligada ao alvo por um fio vinho de 1,5 px que termina num ponto spark.
- **Bracket**: colchete vinho ao lado de um grupo de alvos, com tag no meio.
- **Obturador**: o espécime se cobre de papel, a página troca de estado e o papel se abre.

Mostradores:

- **count**: legenda mono, número de 84 px que conta de zero ao valor.
- **shift**: legenda mono, número que parte do valor anterior e conta até o novo, linha "antes" e chip de delta spark (`−85%`).
- **bars**: linhas com rótulo mono, trilho pedra e segmentos proporcionais aos facts (vinho → vinho suave → spark), com o total à direita.

## 6. Timing (segundos reais, por tomada)

| Batida | t | O que acontece |
|---|---|---|
| travel | 0 → 0,9 | A câmera viaja para o novo enquadramento e as marcas anteriores somem. O texto anterior sai (0 → 0,4) e o novo só entra depois, em cascata: eyebrow/claim 0,42, sub +0,12, readouts +0,24, fonte +0,36 (cada um em 0,6 s). Os dois textos nunca dividem a tela. |
| mark | 0,9 → 1,9 | Véu (0,9 → 1,3), contorno (0,95 → 1,5), marca-texto (1,2 →, escalonado 0,1) e tags (1,4 → 1,9). |
| measure | 1,6 → 2,8 | `count` e `bars` crescem do zero. |
| swap | 3,0 → 4,4 | Só em tomadas com `swap`: o obturador fecha (3,0 → 3,3), a página troca, o obturador abre (3,3 → 3,7), `shift` conta (3,3 → 4,3) e o delta entra (4,0 → 4,4). As marcas são redesenhadas para o estado novo. |
| read | → fim | Leitura. Nos últimos 0,35 s as marcas recolhem. |

Durações padrão: tomada 7 s, tomada com swap 8 s, capa 3,2 s, fecho 4,6 s. Alvo total: 40–55 s. A capa aparece completa no t = 0, porque vira thumbnail; o fecho termina com 0,8 s de fade para o canvas.

Curvas: `glide` (in-out cúbica) para câmera e obturador; `rise` (out quártica) para texto e contadores; `sweep` (in-out quadrática) para traços e marca-texto.

## 7. Câmera

- O enquadramento é o retângulo dos alvos de `frame` mais `pad` (padrão 32), ajustado ao espécime com escala máxima de 1,5.
- O centro é limitado à largura da página e ao topo; abaixo do fim da página há papel.
- A escala entre tomadas é interpolada geometricamente e o centro linearmente, durante `travel`.

## 8. Fatos e textos

```ts
const fact = facts({ metrics, perf })                  // JSONs importados de evidence/
const cpu = fact('perf:summary.react-abstracted.taskDurationMs.median', { dec: 1, unit: 'ms' })
claim: say`Com Controller, ${renders} renders e ${cpu} de CPU.`
```

- `fact` lê o caminho no JSON e falha se ele não existir ou não for número.
- `sum(a, b)` cria um fact derivado, com a origem composta.
- `say` monta o texto. Dígitos nas partes literais são erro; `lit('002')` declara um literal permitido.
- A formatação é pt-BR (`49,5`, `107.389`). A precisão declarada é a precisão exibida, e arredondar é permitido quando o post usa o mesmo arredondamento.

## 9. QA automático

O motor reporta **erros**, que bloqueiam `render`:

- fact inválido;
- dígito solto;
- seletor sem elemento visível;
- claim com mais de 3 linhas ou sub com mais de 2.

E **avisos**:

- tag ou bracket sobre texto da página;
- tag fora do espécime.

`sheet` gera uma folha de contato com as batidas de cada tomada.

## 10. Estrutura

```
.claude/skills/lab-reel/
  SKILL.md        fluxo de trabalho (prompt)
  SPEC.md         esta especificação
  PROVENANCE.md   procedência e ressalvas
  kit/            copiado para cada lab
    reel/core.ts  tipos, curvas, facts, say
    reel/probe.ts medição do iframe
    reel/view.ts  DOM, estilos e pintura
    reel/run.ts   linha do tempo, preview e captura
    reel.html     página de preview
    reel.mjs      CLI: check · sheet · render
```

No lab: `src/reel/` (kit) + `src/reel/story.ts` (conteúdo do post) + `reel.html` + `scripts/reel.mjs`.
