# Formulários React com uma API declarativa: quem mantém a abstração?

React resolve a camada de UI. Para construir formulários, ainda precisamos decidir como registrar campos, validar dados, exibir erros, acompanhar estados como `dirty` e `touched` e transformar os valores antes do envio. Podemos implementar tudo na aplicação ou delegar parte desse trabalho a bibliotecas e abstrações locais.

Foi esse segundo caminho que quis testar. A abstração deste lab existe para simplificar o código escrito nas telas e dar ao time uma API consistente. Quem desenvolve uma feature deveria conseguir declarar um campo com nome, label e tipo sem remontar a integração com React Hook Form, Zod e o design system a cada formulário.

Para comparar essas escolhas, implementei o mesmo formulário de seis maneiras:

- React apenas com `useState`;
- React com React Hook Form e Zod;
- React com uma abstração local sobre RHF e Zod usando `useController`;
- React com a mesma abstração pública usando inputs uncontrolled e `register`;
- Vue;
- AngularJS.

A comparação investiga duas perguntas. Quanto código e contexto a abstração retira das telas? Quanto custa, em execução e manutenção, oferecer essa experiência ao time?

## A DX que estamos tentando construir

Sem a abstração, a tela conhece diretamente `register`, `handleSubmit`, `formState.errors` e a estrutura visual de cada campo:

```tsx
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm({ resolver: zodResolver(accountSchema) })

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    <label>
      E-mail
      <input {...register('email')} type="email" />
    </label>
    <p className="error">{errors.email?.message ?? ''}</p>
  </form>
)
```

Esse uso segue a API oficial de [`register`](https://react-hook-form.com/docs/useform/register), que registra inputs nativos e devolve `name`, `ref`, `onChange` e `onBlur`.

Nas duas versões abstraídas, a tela escreve isto:

```tsx
const { Form, Field } = useCreateForm(accountSchema, defaultValues)

<Form onSubmit={onSubmit}>
  <Field.Text name="email" label="E-mail" />
</Form>
```

O nome do campo recebe autocomplete a partir do schema. Registro, estado, erro e convenções visuais ficam centralizados. Para quem implementa a tela, as duas versões da infraestrutura são iguais: a diferença entre controlled e uncontrolled não vaza para o call site.

Essa separação afeta o trabalho cotidiano. A equipe ganha:

- autocomplete e erro de compilação para nomes que não existem no schema;
- o mesmo markup de label e mensagem de erro em todas as telas;
- um ponto central para corrigir ou evoluir os controles;
- menos conhecimento de RHF e Zod exigido para implementar o caso comum.

O possível ganho está em reduzir decisões repetidas e impedir que cada tela invente sua própria convenção. O código demonstra essa centralização, mas o lab não mede produtividade, onboarding nem velocidade de evolução.

O consumidor abstraído tem 21 linhas. A infraestrutura com Controller tem 42 e a uncontrolled, 43. Somando as 8 linhas do schema, o primeiro formulário custa 71 ou 72 linhas, conforme a implementação. RHF e Zod usados diretamente somam 34. A versão com `useState` tem 37, Vue tem 27 e AngularJS, 43.

Esses números mostram onde o código ficou; não medem produtividade. Depois que a infraestrutura existe, cada formulário abstraído exige 21 linhas no call site, contra 26 no uso direto de RHF e Zod. A diferença marginal de cinco linhas é pequena. O caso a favor da abstração depende da consistência que ela entrega ao longo de muitos formulários, não da contagem de um único arquivo.

## A mesma API, duas implementações

A primeira infraestrutura usa [`useController`](https://react-hook-form.com/docs/usecontroller). O hook foi criado para componentes controlados e entrega o valor, os handlers, a referência e o estado do campo:

```tsx
function Text({ name, label, ...props }) {
  const { control } = useFormContext()
  const { field, fieldState } = useController({ control, name })

  return (
    <Shell label={label} error={fieldState.error?.message}>
      <input {...props} {...field} value={String(field.value ?? '')} />
    </Shell>
  )
}
```

Cada alteração passa por `field.onChange`, atualiza o valor acompanhado pelo RHF e renderiza novamente o wrapper daquele campo. Esse protocolo é necessário para componentes que exigem controle externo, como muitos date pickers, comboboxes e componentes de bibliotecas visuais. A própria documentação do RHF apresenta [`Controller`](https://react-hook-form.com/docs/usecontroller/controller) como a ponte para esse tipo de integração.

A segunda infraestrutura mantém os inputs nativos uncontrolled com `register`. Ela usa [`useFormContext`](https://react-hook-form.com/docs/useformcontext) para acessar o formulário e [`useFormState`](https://react-hook-form.com/docs/useformstate) para assinar somente o erro daquele campo:

```tsx
function Text({ name, label, ...props }) {
  const { register, control } = useFormContext()
  const { errors } = useFormState({ control, name, exact: true })

  return (
    <Shell label={label} error={get(errors, name)?.message}>
      <input {...props} {...register(name)} />
    </Shell>
  )
}
```

O valor continua no elemento do DOM enquanto o RHF o acompanha por referência e eventos. `useFormState` isola a assinatura no wrapper, de modo que uma mudança no estado de outro campo não precisa renderizá-lo. Para a tela, porém, o consumo continua sendo `<Field.Text name="email" label="E-mail" />`.

## O custo em tela

Submeti as quatro versões React ao mesmo cenário automatizado no Chrome: preencher os cinco campos e enviar o formulário. Descartei uma execução de aquecimento e coletei dez amostras. O benchmark mede chamadas de funções de render, tempo de CPU acumulado no cenário e JavaScript de produção de cada versão isolada.

| Estratégia | Chamadas de render | CPU mediana | Bundle gzip |
|---|---:|---:|---:|
| Abstração · Controller | 73 | 49,523 ms | 107.389 B |
| Abstração · uncontrolled | 11 | 33,061 ms | 106.257 B |
| RHF + Zod direto | 2 | 32,703 ms | 105.541 B |
| `useState` | 63 | 71,190 ms | 69.763 B |

Os 73 renders da abstração com Controller não significam 73 renders do formulário inteiro. Foram 72 chamadas nos wrappers dos campos e uma no `App`. Com a mesma API para o consumidor, a variante uncontrolled fez 11 chamadas: duas por wrapper e uma no `App`. Na versão com `useState`, todas as 63 chamadas renderizaram o componente completo. A granularidade muda o peso de cada chamada.

RHF direto teve o menor custo de CPU neste recorte, com 32,703 ms. A abstração uncontrolled ficou em 33,061 ms. Como registra os inputs por referência, ela não atualiza o React a cada tecla. A variante com Controller assina o valor e o estado de cada campo e chegou a 49,523 ms.

O bundle uncontrolled adicionou 716 bytes gzip sobre RHF direto. Na versão controlada, a diferença foi de 1.848 bytes. Os dois perfis têm a mesma interface pública; a escolha entre `useController` e `register` fica escondida dentro da abstração e explica boa parte da diferença de execução observada aqui. Inputs nativos aceitam `register`, portanto não precisavam ser controlados neste formulário. Essa distinção também aparece no guia oficial de [integração com componentes controlados](https://react-hook-form.com/get-started#IntegratingControlledInputs): o RHF privilegia inputs nativos uncontrolled e oferece Controller para componentes cuja API exige controle externo.

O experimento mostra um custo mensurável, sem demonstrar impacto perceptível para o usuário. `TaskDuration` é uma medida comparativa de CPU, diferente de INP ou latência percebida. Também são apenas dez execuções de um formulário pequeno em uma máquina, o que limita qualquer generalização.

A versão com `useState` teve o menor bundle, aproximadamente 35,8 KB gzip abaixo de RHF e Zod. Ao mesmo tempo, apresentou o maior tempo de CPU porque cada alteração atualizou o componente inteiro. Bundle, quantidade de chamadas e tempo de CPU descrevem aspectos diferentes e precisam ser lidos juntos.

## Onde as decisões ficam

Nas versões React, a complexidade muda de lugar. Com `useState`, valores, handlers, validação e normalização vivem na aplicação. RHF e Zod assumem registro, estado e contrato. A abstração local também centraliza binding, tipos e apresentação de erros. Dentro dela, a escolha entre Controller e uncontrolled altera a execução sem mudar o call site.

Vue toma mais decisões sobre binding e reatividade por meio de `v-model`. Sua base não traz uma solução completa de validação de formulários, então essa parte continuou na aplicação.

AngularJS incorpora binding, descoberta de campos, validade, `dirty` e `touched` no framework. Isso reduz a montagem no caso básico e aumenta a dependência de sua semântica. Como a tecnologia foi descontinuada, ela aparece aqui apenas como referência histórica.

O experimento mostra onde cada implementação coloca decisões sobre binding, validação e estado do campo. A abstração React padroniza uma parte desse trabalho. Isso não equivale a uma DX de framework: o lab não avalia convenções de aplicação, roteamento, dados, lifecycle ou tooling.

## O custo de manter a abstração

A abstração local tipa nomes de campos, centraliza erros e convenções e permite mudanças transversais nos controles. Em troca, cada tipo novo de controle exige suporte. Arrays, campos dependentes e erros globais pressionam a interface simples. Parte da ergonomia depende de casts internos, e a camada precisa absorver upgrades das bibliotecas. Na prática, a equipe passa a manter uma infraestrutura própria de formulários.

Também não existe uma escolha única para todos os componentes. Inputs HTML simples podem seguir o caminho uncontrolled. Um componente que só funciona com `value` e `onChange` precisa de Controller. Se o catálogo ganhasse um date picker controlado, a infraestrutura poderia esconder essa diferença da tela:

```tsx
<>
  <Field.Text name="email" label="E-mail" />
  {/* Extensão hipotética, não implementada no lab */}
  <Field.DatePicker name="birthDate" label="Data de nascimento" />
</>
```

Os dois componentes poderiam oferecer a mesma API e usar protocolos diferentes internamente. O exemplo é uma direção possível para o catálogo; o lab não implementa nem mede o `DatePicker`.

Neste formulário, a performance não sustenta uma objeção forte à abstração. O overhead foi pequeno em termos absolutos, principalmente na variante uncontrolled, e o benchmark não mostrou impacto perceptível. O compromisso de manutenção continua sendo o custo mais relevante: a interface interna precisa permanecer correta quando os formulários ficarem mais complexos.

O lab demonstra uma API declarativa para um recorte específico: formulários React com campos comuns, schema Zod e estado no React Hook Form. Ela concentra complexidade para simplificar os consumidores, mas deixa arrays, dependências entre campos e erros globais expostos à API bruta. O valor dessa troca depende de quantas vezes os mesmos padrões se repetem no produto.

## Referências

- [React Hook Form: `register`](https://react-hook-form.com/docs/useform/register)
- [React Hook Form: `useController`](https://react-hook-form.com/docs/usecontroller)
- [React Hook Form: `Controller`](https://react-hook-form.com/docs/usecontroller/controller)
- [React Hook Form: `FormProvider`](https://react-hook-form.com/docs/formprovider) e [`useFormContext`](https://react-hook-form.com/docs/useformcontext)
- [React Hook Form: `useFormState`](https://react-hook-form.com/docs/useformstate)
- [React Hook Form: integração com componentes controlados](https://react-hook-form.com/get-started#IntegratingControlledInputs)
- [React Hook Form Resolvers: integração com Zod](https://github.com/react-hook-form/resolvers#zod)

## Notas editoriais

- Este rascunho acompanha a tese e os limites do texto final em `post.md`.
- Incluir a URL pública do laboratório e dos dados brutos quando o blog estiver disponível.
- Manter as limitações junto às métricas; não converter o resultado em ranking de frameworks.
