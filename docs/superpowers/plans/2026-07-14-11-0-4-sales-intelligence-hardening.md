# 11.0.4 Sales Intelligence — Hardening e fechamento

## Objetivo

Fechar o Core 11.0 com consultas e dependências validadas, documentação operacional completa e indicadores reutilizáveis que mantenham Analytics alinhado à Inteligência de vendas.

## Tarefas

- [x] Criar teste regressivo para a grade compacta de quatro indicadores do Analytics → Verificar: teste falha sem os componentes métricos compartilhados.
- [x] Extrair grade/cartão de indicadores e aplicar em Analytics e Sales Intelligence → Verificar: ambas as telas usam o mesmo componente e preservam responsividade, tokens e i18n.
- [x] Validar filtros, paginação em grandes intervalos e índices usados pela leitura → Verificar: testes focados e evidência de plano de consulta/indexação.
- [x] Revisar autorização, isolamento por tenant, DTOs e ausência de payload sensível → Verificar: checklist de segurança e testes de controller/service passam.
- [x] Atualizar dependências vulneráveis de produção de forma isolada → Verificar: `npm audit --omit=dev` sem vulnerabilidade alta/moderada no runtime.
- [x] Atualizar PRD, SDD, spec, backlog, ADR, README e operação → Verificar: documentos marcam 11.0.4 e o Core como concluídos.
- [x] Executar Prisma, testes, type-check, lint, i18n, builds e smoke das rotas → Verificar: todos os comandos finalizam com sucesso.

## Concluído quando

- [x] Analytics exibe seus quatro indicadores na mesma grade compacta da Inteligência de vendas em desktop e responsiva em telas menores.
- [x] O Core 11.0 atende performance, segurança, dependências, documentação e smoke runtime.
- [x] A branch da sprint volta à branch base e a fase validada chega à `develop` conforme o fluxo aprovado.

## Notas

- O escopo continua restrito a pedido, pagamento, taxa, líquido e estoque; lucro/DRE e demais itens da spec ampla não entram na fila de vendas.
- Nenhum identificador de tenant, segredo ou payload bruto de marketplace deve ser inferido do cliente ou exposto nas respostas.
