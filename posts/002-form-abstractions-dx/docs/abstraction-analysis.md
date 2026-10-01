# Análise da abstração de formulários

## O módulo

`useCreateForm(schema, options)` liga quatro camadas:

1. Zod define entrada, saída, transformação e mensagens de validação.
2. React Hook Form gerencia registro, estado, submissão e erros.
3. `FormProvider` oferece o estado por contexto.
4. `Field.*` adapta cada controle visual ao mesmo shell de label, descrição e erro.

A interface entregue ao consumidor é pequena:

```tsx
const { form, Form, Field } = useCreateForm(SCHEMA)

<Form form={form} onSubmit={onSubmit}>
  <Field.Text name="email" label="E-mail" />
</Form>
```

O `name` é inferido de `z.input<typeof schema>`, o `onSubmit` recebe `z.output<typeof schema>` e o consumidor não repete genéricos.

## Onde a abstração é profunda

- Um `name` inválido falha em compilação.
- Registro, valor controlado, blur, ref, estado dirty/touched/invalid e mensagem de erro deixam de ser repetidos.
- O shell visual e a prioridade `erro > hint > descrição` ficam consistentes.
- Transformações do schema distinguem corretamente o valor digitado do valor submetido.
- Componentes especializados cobrem diferenças reais de protocolo entre text, select, number e checkbox.
- A implementação de um controle pode ser substituída sem alterar seus consumidores: uma seam útil.
- Comportamentos transversais, como loading assíncrono, podem ser integrados em um único ponto.

Pelo teste de deleção: remover o módulo espalharia integração RHF, renderização de erro e convenções visuais por dezenas de campos. Portanto, ele está ganhando seu custo.

## Trade-offs e custos

### 0. A interface pública não determina o modelo de binding

O lab implementa a mesma superfície `Form`/`Field.*` de duas formas. A primeira usa `useController`, controla `value`/`checked` e assina valor e estado por campo. A segunda usa `register`, mantém os valores dos inputs nativos no DOM e assina apenas o erro correspondente com `useFormState`. No mesmo cenário, a primeira registrou 73 chamadas de render e 49,523 ms de CPU mediana; a segunda, 11 e 33,061 ms. Portanto, o custo observado não pode ser atribuído à abstração genericamente: a escolha de binding escondida dentro dela é causalmente relevante.

### 1. “Zod isolado” é verdade só na importação

O comentário diz que trocar a biblioteca de validação tocaria um arquivo. O adaptador do resolver está concentrado, mas a interface pública depende semanticamente de `z.input`, `z.output`, transforms e mensagens do Zod. Trocar por uma biblioteca com outro modelo de input/output ou erros provavelmente altera schemas, inferência e testes. O acoplamento está localizado; não eliminado.

### 2. O type safety tem casts estruturais no centro

`FieldNamespace as BoundField<Values>` e o cast duplo do `zodResolver` pedem que o mantenedor prove manualmente algo que TypeScript não provou. O consumidor recebe autocomplete excelente, mas a garantia depende da correção desses casts e dos wrappers. A complexidade de tipos foi transferida, não removida.

### 3. `name` é seguro; valor e props não são totalmente correlacionados

O próprio código documenta que props dependentes do valor não são inferidas do path para evitar union widening. Assim, é possível escolher um wrapper semanticamente inadequado para um campo válido. `Field.Text name="age"` pode passar pelo vínculo do nome mesmo que `age` seja número; casts como `field.value as string` escondem essa incompatibilidade.

### 4. Cada controle novo cobra manutenção transversal

Adicionar date picker, combobox, file upload ou lista dinâmica exige props, wrapper, binding de eventos/ref, acessibilidade, export e entrada no namespace. A interface é pequena para consumidores, mas o catálogo vira código de plataforma interno.

### 5. A abstração não cobre a complexidade de domínio

Em formulários com campos dependentes, listas dinâmicas ou permissões, `watch`/`setValue` continuam expostos. Erros globais (`errors.root`) também precisam ser renderizados fora do shell. A abstração é forte para controles comuns, não para regras relacionais, arrays, erros globais ou orquestração assíncrona.

### 6. Há dois caminhos de uso

Alguns consumidores usam o `Form` retornado por `useCreateForm`; outro importa `Form` diretamente. Ambos funcionam, mas ampliam a interface conceitual e criam uma pergunta de DX: qual é o caminho canônico?

### 7. Dependências e comportamento ficam implícitos

Um campo visualmente simples depende de contexto RHF, primitives de UI, convenções de `aria-invalid`, animação de mensagens e formato de valor de cada controle. Isso reduz ruído no call site, mas aumenta o salto necessário para depurar comportamento inesperado.

### 8. A ergonomia favorece o caminho padronizado

Essa é uma escolha válida, não um defeito automático. Porém, quanto mais singular o formulário, menor a alavancagem e maior a chance de escapar por `Field` genérico ou pela API bruta de `form`. O retorno diminui quando exceções passam a dominar.

## Julgamento

A abstração reduz integração repetida e permite trocar a estratégia de binding sem alterar os consumidores. Ela cria uma API local e opinativa para o caminho comum dos formulários React. O lab não mede se essa API melhora produtividade, onboarding ou velocidade de evolução.

O custo principal é organizacional: a equipe passa a manter uma infraestrutura de formulários. A troca parece mais defensável enquanto o vocabulário de campos é estável e repetido. A interface curta não prova complexidade baixa, e o acoplamento semântico com Zod impede prometer uma troca trivial de validação. A formulação sustentada pelo código é: **o produto centralizou complexidade e decisões para simplificar os call sites.**
