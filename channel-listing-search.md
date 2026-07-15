# Busca na Malha Fina

## Goal

Permitir localizar anúncios por ID externo, título, produto ou SKU sem perder os filtros e a paginação existentes.

## Tasks

- [x] Adicionar busca textual tenant-scoped ao endpoint paginado de anúncios.
- [x] Conectar um campo com debounce à store e ao filtro de status.
- [x] Traduzir rótulo e placeholder em PT-BR e EN-US.
- [x] Executar testes focados, lint, tipos e build.

## Done When

- [x] A busca retorna apenas anúncios do tenant e reinicia na primeira página.
- [x] API e web passam nas validações automatizadas.
