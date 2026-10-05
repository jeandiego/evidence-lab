# State ownership: sua store global virou uma segunda fonte de verdade?

O problema não começa quando você escolhe Zustand.

Começa quando você escolhe a store antes de decidir quem é o dono do estado.

Esse é um caminho comum em aplicações React:

> “Vamos precisar desses dados em várias telas. Melhor começar com uma store global.”

A decisão parece inofensiva. A store oferece acesso simples, leitura imperativa e persistência entre rotas. Logo ela recebe o usuário, o carrinho, o draft, a unidade, configurações e respostas inteiras da API.

Em algum momento, dados que pertencem ao servidor passam a existir também numa cópia mutável no cliente.

A partir daí, cada mutation precisa responder a uma pergunta que a arquitetura criou: como manter as duas representações sincronizadas?

## Uma troca aparentemente simples

Montei um laboratório com um fluxo pequeno. Luna está coberta por um plano e seu atendimento custa zero. O usuário troca o PET para Thor, cujo atendimento é particular.

No servidor, selecionar Thor produz um novo snapshot:

```ts
{
  pet: { id: 'thor', name: 'Thor' },
  coverage: { kind: 'PRIVATE' },
  subtotalCents: 14000,
  discountCents: 2000,
  totalCents: 12000,
  revision: 2,
}
```

Na primeira arquitetura, a interface renderiza uma cópia desse estado guardada no Zustand. A action que trata a mutation faz isto:

```ts
applyPetOnly: (serverSnapshot) =>
  set((state) => ({
    snapshot: state.snapshot
      ? { ...state.snapshot, pet: serverSnapshot.pet }
      : serverSnapshot,
  }))
```

O nome deixa o problema explícito porque o lab precisa torná-lo observável. Em produção, a action provavelmente teria um nome razoável como `selectPet`, `updateCart` ou `applyChanges`.

O desenvolvedor pensa na ação como “trocar o PET” e atualiza apenas o campo que representa essa intenção.

Só que, para o domínio, não aconteceu apenas uma troca de PET. Cobertura, preço, desconto, total e revisão também mudaram.

Depois da mutation, a interface mostra:

```ts
{
  pet: { id: 'thor', name: 'Thor' },
  coverage: { kind: 'PLAN' },
  subtotalCents: 0,
  discountCents: 0,
  totalCents: 0,
  revision: 1,
}
```

Thor aparece na tela com os dados financeiros de Luna.

O TypeScript não reclama. A aplicação não lança uma exceção. Todos os campos obrigatórios existem e cada valor, isoladamente, é válido.

É um bug silencioso e visualmente plausível.

## A action foi modelada pela intenção da interface

“Trocar o PET” descreve o botão que a pessoa pressionou. Não descreve toda a transição realizada pelo servidor.

Esse descompasso aparece em vários formatos:

- trocar o paciente também muda elegibilidade e convênios;
- adicionar um produto recalcula descontos e total;
- selecionar uma unidade altera disponibilidade e preço;
- mudar a forma de pagamento invalida campanhas ou condições anteriores;
- remover uma transação afeta o draft e uma cópia separada do carrinho.

Enquanto a operação é pequena, atualizar dois campos parece administrável. Conforme o domínio cresce, cada novo campo aumenta o conjunto de actions que precisam conhecê-lo.

O problema não está no spread. Ele apenas materializa uma decisão anterior: o cliente está tentando reconstruir localmente uma entidade que o servidor já sabe produzir.

## Quando o contrato evolui

Para testar a consequência dessa escolha, evoluí o contrato do laboratório.

O servidor ganhou dois campos derivados:

```ts
subtotalCents: number
discountCents: number
```

E passou a calcular:

```ts
totalCents = subtotalCents - discountCents
```

Comparei duas estratégias:

1. uma projeção manual que enumerava todos os campos conhecidos antes da mudança;
2. a substituição do snapshot remoto pela resposta canônica.

Na projeção manual, o código continuou compilando e os campos antigos continuaram corretos. Os dois campos novos simplesmente não entraram na cópia. Surgiram duas divergências e a action precisaria ser modificada.

Na substituição canônica, a lógica de reconciliação não mudou:

```ts
queryClient.setQueryData(labStateKey, serverSnapshot)
```

Isso não quer dizer que a apresentação ganhou suporte automático. Se a interface quiser exibir desconto, ainda precisará ser alterada. O que deixou de existir foi uma segunda lista de campos cuja função era apenas manter uma cópia remota atualizada.

O benchmark mede amplificação de mudança na sincronização. Não mede performance de renderização, memória ou velocidade de Zustand e TanStack Query.

## O que apareceu numa aplicação real

O laboratório isola o mecanismo, mas eu queria saber quanto desse trabalho aparecia numa base real.

Auditei uma aplicação de agendamento que atende mais de 1 milhão de usuários. O produto e a empresa foram anonimizados; a contagem foi preservada com evidência por arquivo e linha.

Foram encontradas 23 operações de sincronização manual relacionadas à store principal:

| Classificação | Operações | Leitura |
| --- | ---: | --- |
| Evitáveis | 6 | Cópias de estado remoto que poderiam permanecer sob uma camada proprietária de server state |
| Simplificáveis | 13 | Alguma reconciliação continuaria necessária, mas poderia ser reduzida ou centralizada |
| Legítimas | 2 | Estado pertencente ao cliente, como interação ou workflow local |
| Inconclusivas | 2 | O código observado não permitiu afirmar ownership com segurança |

Esses números não dizem que 19 bugs existiam. Também não dizem que remover Zustand apagaria 19 trechos automaticamente.

Eles localizam a superfície de manutenção: 19 de 23 operações dependiam de sincronizações que poderiam desaparecer ou ficar mais estreitas com uma separação melhor entre client state e server state.

Os casos mais reveladores não eram setters simples. Eram operações como:

- copiar uma resposta remota completa para a store e também espelhar seus produtos em `cart`;
- receber uma resposta de mutation, mas reconstruir a store a partir do input enviado;
- atualizar o paciente selecionado e também sua representação numa coleção de pacientes;
- remover dados no backend e reconstruir manualmente draft, transações e carrinho;
- manter listas explícitas de campos preservados durante limpeza e persistência.

Cada solução local pode parecer razoável. O risco aparece na soma: várias representações, vários escritores e várias oportunidades de uma evolução chegar a um caminho e não chegar a outro.

## Zustand não é o problema

Zustand pode ser uma boa escolha para estado pertencente ao cliente:

- estado de interface compartilhado;
- progresso temporário de um fluxo;
- preferências ainda não persistidas no servidor;
- coordenação local entre componentes distantes;
- dados que não possuem uma fonte remota canônica.

O mesmo vale para Redux, Context ou qualquer outra store.

Também seria incorreto dizer que TanStack Query ou Apollo eliminam todo trabalho de consistência. Mutations ainda podem exigir invalidação, refetch, optimistic updates, rollback e atualização coordenada de queries relacionadas.

A diferença está no ponto de partida.

Uma camada de server state assume que os dados remotos pertencem ao servidor e oferece mecanismos para cacheá-los, invalidá-los e reconciliá-los. Uma store genérica aceita qualquer coisa. Se colocamos nela uma cópia do snapshot remoto, somos nós que passamos a definir o protocolo de coerência.

O problema não é ter uma store.

É pedir para ela ser dona de coisas demais.

## Testar a action não basta

Outro efeito aparece nos testes. É comum verificar que uma action atualizou o campo esperado:

```ts
expect(store.pet.id).toBe('thor')
```

Esse teste pode passar enquanto o snapshot está semanticamente quebrado.

O contrato mais valioso é uma invariância:

> Depois de uma operação confirmada pelo servidor, a fonte usada para renderizar a interface não pode combinar campos pertencentes a revisões diferentes.

No lab, o diff compara PET, cobertura, preço, subtotal, desconto, total e revisão. O teste não pergunta apenas se o setter funcionou. Ele pergunta se o estado resultante continua representando uma versão possível do domínio.

Testes de implementação ainda têm valor. O problema é testar a action e nunca testar a invariância que ela deveria preservar.

## A pergunta anterior à ferramenta

Antes de adicionar uma store, eu faria estas perguntas:

1. Quem é a fonte canônica deste dado?
2. O dado precisa sobreviver a refetch, expiração ou atualização feita em outro dispositivo?
3. Ele representa uma entidade remota ou uma interação local?
4. Quantas representações desse valor existirão no cliente?
5. Quantos caminhos poderão escrevê-lo?
6. Se o contrato ganhar um campo amanhã, quais lugares precisarão conhecê-lo?

Só depois escolheria o mecanismo.

Quando o servidor é o dono, copiar seus dados para uma store transforma consistência em sincronização manual. E cada sincronização manual aumenta o risco de esquecimento conforme o domínio cresce.

Escolher Zustand é fácil.

Difícil é perceber quando a store virou uma segunda fonte de verdade.

## Limitações

- O laboratório usa um domínio pequeno e uma divergência intencional para tornar o mecanismo visível.
- O benchmark adiciona dois campos a uma única action; uma aplicação pode ter mais ou menos amplificação.
- A auditoria real é uma fotografia da versão analisada e uma classificação arquitetural, não uma contagem de bugs em produção.
- “Evitável” pressupõe uma arquitetura alternativa explícita; não significa que o código poderia ser simplesmente apagado.
- O trabalho não compara performance entre Zustand e TanStack Query.
- Estado remoto e local podem formar casos mistos; a separação nem sempre é binária.

## Reproduza

```bash
git clone https://github.com/jeandiego/evidence-lab.git
cd evidence-lab/posts/004-state-ownership/lab
npm install
npm run dev
```

Abra `http://localhost:4174/?variant=a1`, execute a troca para Thor e compare o snapshot do servidor com a fonte que renderiza a interface. Depois execute a variante A2.

Para regenerar o benchmark de evolução do contrato:

```bash
npm run benchmark:contract
```

## Notas editoriais

- Tese: o problema não é Zustand; é atribuir ownership de estado remoto a uma cópia mutável no cliente.
- Não transformar o texto em ranking de bibliotecas.
- Manter “mais de 1 milhão de usuários” sem identificar produto ou empresa e sem acrescentar frequência diária.
- Os números da auditoria descrevem pontos de sincronização, não bugs encontrados.
- Alternativa de título: “O servidor mudou. Sua store percebeu?”.
- Trecho para chamada: “O TypeScript não reclama. A aplicação não lança uma exceção. É um bug silencioso e visualmente plausível.”
