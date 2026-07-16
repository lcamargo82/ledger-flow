# Mercado Livre User Products e paginação global

## Objetivo

Suportar `MLBU/User Products` sem romper pedidos baseados em `MLB` e padronizar primeira/anterior/próxima/última página em toda tabela que já possui contrato paginado.

## Decisões

- `MLB` permanece a identidade da condição de venda; `MLBU` identifica o produto físico e pode agrupar vários itens `MLB`.
- A Malha fina continua por item, mas exibe, pesquisa e agrupa condições pelo `MLBU`; mapear um User Product propaga o SKU aos itens relacionados do mesmo tenant e integração.
- Reimportações atualizam dados do provider, mas nunca desfazem mapeamentos manuais válidos.
- Estoque multiorigem usa um vínculo explícito entre warehouse LedgerFlow e seller warehouse Mercado Livre; ausência de vínculo falha de forma segura.
- Primeira/última página será responsabilidade de `AppPagination`; telas com controles manuais serão migradas para o componente compartilhado.

## Implementação

- [x] Adicionar `externalUserProductId` nullable e indexado em `ChannelListing`, mais vínculo tenant-scoped do depósito padrão com os identificadores do seller warehouse quando multiorigem → Migration aditiva, Prisma generate e deploy local validados.
- [x] Capturar `user_product_id` em `/items/{MLB}` e consultar `/users/{seller}/items/search?user_product_id={MLBU}` → Busca direcionada, deduplicação e token sanitizado cobertos por testes.
- [x] Tornar a importação idempotente e preservar `MATCHED`/mapeamento manual; reimportar preenche MLBU nos registros existentes sem backfill externo dentro da migration → Regressão automatizada criada.
- [x] Expor MLBU nos DTOs, busca tenant-scoped, Malha fina e modal; propagar mapeamento para condições do mesmo User Product com auditoria → Pesquisa por `MLBU4292355491` suportada.
- [x] Selecionar estratégia de estoque por capacidade: item legado quando suportado e User Product por seller warehouse em multiorigem → Versão, localização, deduplicação, retry/circuit breaker e bloqueio seguro implementados.
- [x] Evoluir `AppPagination` com primeira/anterior/próxima/última, estados desabilitados, `aria-label`, PT-BR/EN-US e layout responsivo → Emissões e limites cobertos por teste de componente.
- [x] Migrar paginações manuais de Catálogo, Clientes, Pedidos, Pagamentos e Usuários para `AppTable/AppPagination`; validar consumidores diretos em Analytics, Canais, Exportações, Estoque, Permissões, Plataforma, Conciliação, Recebíveis, Sales Intelligence e Auditoria → Nenhum controle manual duplicado permanece.
- [x] Cobrir API, repository, adapter, store e UI com regressões; executar lint direcionado, testes, builds e i18n → API e web validados integralmente.
- [ ] Fazer rollout seguro: migration, deploy API/worker/web, reimportação por integração, mapeamento, replay do Inbox/DLQ e observabilidade → Verificar `MLBU4292355491`, seus MLB, saldo e pedido na Inteligência de vendas sem expor credenciais.

## Concluído quando

- [x] `MLBU4292355491` é localizável e relaciona todas as condições `MLB` retornadas pelo Mercado Livre.
- [x] Reimportar anúncios não remove mapeamentos manuais e o estoque usa o endpoint compatível com a conta.
- [x] Toda tabela já paginada permite ir diretamente à primeira e à última página pelo componente compartilhado.

## Entrega

- Branch base: `feature/mercado-livre-user-products-pagination`.
- A entrega foi mantida atômica na branch base para que schema, API, worker e web usem o mesmo contrato no deploy.
- A base só chega à `develop` após revisão e checklist de produção.
