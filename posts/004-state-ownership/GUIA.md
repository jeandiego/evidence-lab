# Lab 004 — State Ownership com PETs

Este lab reproduz uma divergência entre o estado canônico do servidor e uma store global no cliente. Os PETs e dados são totalmente fictícios.

## O que está sendo comparado

- **A1 · Store global:** o PostgreSQL atualiza PET, cobertura, preço e revisão. A action Zustand copia somente o PET e deixa o restante do snapshot antigo.
- **A2 · State ownership:** TanStack Query mantém o snapshot remoto. A resposta da mutation substitui a query canônica; Context injeta o gateway criado por uma factory, sem guardar estado de domínio.

O painel de inspeção compara `pet`, `coverage.kind`, `service.price`, `subtotal`, `discount`, `total` e `revision`.

## Benchmark de evolução do contrato

O contrato ganhou `subtotalCents` e `discountCents`, calculados pelo servidor. O benchmark compara uma projeção manual que enumera os campos conhecidos com a substituição do snapshot canônico:

```bash
npm run benchmark:contract
```

O resultado reproduzível é salvo em `reports/contract-evolution-benchmark.json`. Ele mede amplificação de mudança na sincronização, não performance de renderização: a projeção manual exige alterar a action e deixa dois campos divergentes quando isso é esquecido; a substituição canônica absorve os campos sem alterar a lógica de reconciliação.

## Pré-requisitos

- Node.js 20 ou superior;
- npm 10 ou superior;
- Docker Desktop ou Docker Engine com Compose;
- porta `4174` livre para o frontend;
- porta `4004` livre para a API GraphQL;
- porta `5438` livre para o PostgreSQL.

## Instalação

```bash
cd posts/004-state-ownership/lab
npm install
```

## Subir frontend, API e banco

```bash
npm run dev
```

Esse comando:

1. sobe o PostgreSQL;
2. espera o healthcheck do banco;
3. aplica a migration;
4. aplica o seed determinístico;
5. inicia GraphQL Yoga e Vite juntos.

Abra:

- lab: <http://localhost:4174/?variant=a1>
- GraphiQL: <http://localhost:4004/graphql>

## Reproduzir A1 — divergência

1. Confirme que o seletor está em **A1 · Store global**.
2. Observe a transição proposta: Luna, com plano e custo zero, para Thor, particular e pago.
3. Clique em **Executar troca para Thor**.
4. Abra **Por baixo dos panos** para ver o diff completo e a timeline.

Resultado esperado:

- PostgreSQL/API: Thor, `PRIVATE`, subtotal de `14000`, desconto de `2000`, total de `12000` centavos e revisão `2`;
- Zustand/UI: Thor, `PLAN`, subtotal, desconto e total de `0` centavos e revisão `1`;
- cobertura, preço, subtotal, desconto, total e revisão aparecem em vermelho;
- a timeline registra `apply-pet-only` e a omissão intencional.

## Reproduzir A2 — convergência

1. Clique em **Executar a A2**; o cenário será reiniciado automaticamente.
2. Clique em **Executar troca para Thor**.
3. Abra **Por baixo dos panos** se quiser inspecionar o diff completo.

Resultado esperado:

- PostgreSQL/API e TanStack Query mostram Thor, `PRIVATE`, subtotal de `14000`, desconto de `2000`, total de `12000` centavos e revisão `2`;
- a UI mostra `R$ 120,00`;
- todos os campos aparecem em verde;
- a timeline registra `setQueryData` com o snapshot canônico.

## Testes

Testes unitários e integração real com PostgreSQL:

```bash
npm test
```

E2E completo com Playwright:

```bash
npx playwright install chromium
npm run test:e2e
```

Build e tipos:

```bash
npm run typecheck
npm run build
```

## Inspecionar o banco diretamente

```bash
docker compose exec db psql -U pet_lab -d pet_lab
```

Consultas úteis:

```sql
select * from pets order by name;
select * from lab_sessions order by session_id;
```

O botão **Reiniciar** chama `resetScenario`, repõe Luna e volta a revisão para `1` sem apagar o banco.

## Encerrar

Preservar o volume PostgreSQL:

```bash
npm run down
```

Apagar também os dados do lab:

```bash
npm run down:volumes
```

## Troubleshooting

- **Docker indisponível:** abra o Docker Desktop e execute `npm run dev` novamente.
- **Porta ocupada:** encerre o processo nas portas `4174`, `4004` ou `5438`.
- **Banco antigo:** execute `npm run down:volumes` e depois `npm run dev`.
- **Frontend sem dados:** confirme que <http://localhost:4004/graphql> responde e reinicie o cenário.
- **Playwright sem browser:** execute `npx playwright install chromium`.
