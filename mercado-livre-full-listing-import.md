# Importação completa de anúncios do Mercado Livre

## Goal

Substituir o corte silencioso de 250 anúncios por paginação oficial via `search_type=scan` até o esgotamento dos resultados.

## Tasks

- [x] Adaptar o cliente Mercado Livre para `scroll_id` sem expor credenciais.
- [x] Percorrer todas as páginas, deduplicar IDs e respeitar limite somente quando explícito.
- [x] Cobrir mais de cinco páginas e término seguro com testes.
- [x] Executar lint, testes e build da API.

## Done When

- [x] A importação padrão não para em 250 anúncios.
- [x] Uma página repetida não causa loop nem anúncios duplicados.
- [x] Validações automatizadas passam.
