# 11.0.3 — Sales Intelligence Queue

## Goal

Entregar `/sales-intelligence` como fila responsiva por pedido, com resumo, filtros aprovados, paginação e drawer de SKUs, preservando RBAC, capability, i18n e a proveniência explícita do líquido.

## Tasks

- [x] Criar migration idempotente para `sales-intelligence:read` e atribuí-la somente às roles `OWNER` → Verify: migration aplica duas vezes logicamente sem duplicar permissão ou vínculo.
- [x] Definir tipos, serviço e store web para lista e resumo → Verify: testes cobrem parâmetros, resposta, loading e erro sem expor payload bruto.
- [x] Escrever testes de componente em RED para resumo, filtros, paginação, badges e drawer → Verify: testes falham pela ausência dos comportamentos da 11.0.3.
- [x] Implementar a fila responsiva com uma linha por pedido e estados loading/empty/error → Verify: testes exibem pedido, pagamento, taxa, líquido, estoque e paginação.
- [x] Implementar drawer agrupando SKUs, quantidades e estoque por item → Verify: abertura, fechamento por botão/Escape e conteúdo acessível passam.
- [x] Completar pt-BR/en-US e formatação local de datas/moedas → Verify: auditoria i18n e testes de chaves passam.
- [x] Validar API/web e runtime → Verify: testes focados, build, lint, type-check e smoke desktop/mobile de `/sales-intelligence` passam.
- [x] Atualizar a documentação da sprint, versionar, publicar e integrar na base 11.0 com `--no-ff` → Verify: branch base limpa e sincronizada, sem merge em `develop`.

## Done When

- [x] Usuários com permissão e capability veem a fila; roles personalizadas não recebem acesso implicitamente.
- [x] Líquido realizado, conciliado, estimado e indisponível são visualmente inequívocos.
- [x] Nenhum segredo, credencial ou payload bruto de provider aparece na UI ou nos logs.
