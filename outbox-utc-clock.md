# Relógio UTC do outbox

## Goal

Fazer o dispatcher selecionar e bloquear eventos no mesmo relógio UTC usado pelas colunas Prisma `timestamp without time zone`.

## Tasks

- [x] Substituir datas JavaScript interpoladas por relógio UTC do PostgreSQL.
- [x] Aplicar o mesmo relógio a disponibilidade, lock e expiração do lease.
- [x] Criar regressão que valide a consulta independente do timezone da sessão.
- [x] Executar lint, testes e build da API.

## Done When

- [x] Eventos disponíveis em UTC são adquiridos sem atraso de três horas.
- [x] Nenhuma migration ou alteração destrutiva de dados é necessária.
- [x] Validações automatizadas passam.
