# ADR-0011 — Estratégia de Datas, Timezones e Padronização Temporal

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow é uma plataforma financeira B2B que lida com pagamentos, relatórios, webhooks, exportações, auditoria e eventos assíncronos.

Nesses contextos, erros de data e timezone podem gerar problemas sérios:

* Relatórios com período incorreto.
* Pagamentos exibidos no dia errado.
* Webhooks processados fora de ordem.
* Auditoria confusa.
* Divergência entre frontend e backend.
* Erros em fechamento financeiro.
* Problemas em conciliação.
* Filtros inconsistentes.
* Diferença entre timezone do servidor e do usuário.

Como o sistema é multitenant, cada empresa pode operar em timezone diferente.

Exemplo:

* Tenant A opera em `America/Sao_Paulo`.
* Tenant B opera em `America/New_York`.
* Tenant C opera em `Europe/Madrid`.

O sistema precisa persistir datas de forma consistente e exibir datas conforme o contexto correto.

---

## 2. Decisão

O LedgerFlow adotará a seguinte estratégia:

1. Persistir datas em UTC.
2. Usar `TIMESTAMPTZ` no PostgreSQL.
3. Trafegar datas na API em ISO 8601.
4. Exibir datas no frontend conforme timezone do usuário ou tenant.
5. Nunca confiar no timezone local do servidor para regra de negócio.
6. Registrar timezone usado em relatórios.
7. Tratar filtros de período considerando timezone do tenant/usuário.

---

## 3. Regras de Persistência

No PostgreSQL:

```text
Usar TIMESTAMPTZ para campos de data/hora.
```

Exemplos de campos:

```text
createdAt
updatedAt
paidAt
failedAt
refundedAt
receivedAt
processedAt
publishedAt
expiresAt
deletedAt
```

Regras:

* Armazenar tudo em UTC.
* Não armazenar data local sem timezone.
* Não armazenar strings de data quando houver tipo nativo adequado.
* Não usar timezone do servidor como referência de negócio.
* Usar timestamps gerados de forma consistente.

---

## 4. Regras de API

Toda data trafegada pela API deve estar em ISO 8601.

Exemplo:

```json
{
  "createdAt": "2026-06-12T18:30:00.000Z"
}
```

Regras:

* Datas devem ser enviadas com timezone explícito.
* Preferir formato com `Z` quando UTC.
* Não enviar datas ambíguas como `12/06/2026`.
* Não enviar datas sem timezone quando representarem instante.
* DTOs devem validar formato quando necessário.

---

## 5. Regras do Frontend

O frontend deve:

* Receber datas em UTC.
* Exibir datas conforme timezone configurado.
* Usar timezone do usuário/tenant como prioridade.
* Usar timezone do navegador apenas como fallback.
* Usar `Intl.DateTimeFormat` quando possível.
* Evitar manipulação manual de strings de data.
* Exibir timezone em relatórios e telas sensíveis.

Exemplo:

```typescript
export function formatDateTime(
  date: string,
  locale = 'pt-BR',
  timeZone = 'America/Sao_Paulo'
) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone
  }).format(new Date(date));
}
```

---

## 6. Timezone do Tenant

Cada tenant poderá possuir um timezone padrão.

Exemplo:

```text
tenant.timezone = America/Sao_Paulo
```

Esse timezone será usado para:

* Dashboard.
* Filtros por período.
* Relatórios.
* Exportações.
* Exibição de pagamentos.
* Agrupamentos por dia, semana e mês.
* Métricas financeiras.

---

## 7. Timezone do Usuário

No futuro, o usuário poderá possuir timezone próprio.

Prioridade de resolução:

```text
1. Timezone do usuário
2. Timezone do tenant
3. Timezone do navegador
4. UTC
```

---

## 8. Filtros por Período

Filtros como:

```text
Hoje
Ontem
Últimos 7 dias
Este mês
Mês passado
```

devem ser calculados considerando o timezone do tenant ou usuário.

Exemplo:

Um tenant em `America/Sao_Paulo` filtrando “hoje” em 2026-06-12 deve considerar o início e fim do dia em São Paulo, convertendo o range para UTC antes de consultar o banco.

Fluxo:

```text
Usuário escolhe período local
  ↓
Frontend/backend identifica timezone
  ↓
Calcula início/fim no timezone correto
  ↓
Converte para UTC
  ↓
Consulta PostgreSQL
```

---

## 9. Relatórios

Relatórios CSV/XLSX devem conter metadados temporais.

Exemplo:

```text
Período: 01/06/2026 00:00 até 12/06/2026 23:59
Timezone: America/Sao_Paulo
Gerado em: 2026-06-12T18:30:00.000Z
```

Regras:

* Relatório deve informar timezone usado.
* Colunas de data devem ser claras.
* Exportações técnicas podem incluir UTC.
* Exportações de negócio podem exibir horário local.
* Evitar ambiguidade em fechamento financeiro.

---

## 10. Webhooks e Eventos

Eventos devem possuir `occurredAt`.

Exemplo:

```json
{
  "eventId": "uuid",
  "eventType": "payment.approved",
  "tenantId": "tenant-id",
  "traceId": "01HZ...",
  "occurredAt": "2026-06-12T18:30:00.000Z",
  "payload": {
    "paymentId": "payment-id"
  }
}
```

Regras:

* `occurredAt` deve estar em UTC.
* Eventos externos devem preservar timestamp original quando existir.
* Eventos internos devem gerar timestamp no momento da ocorrência.
* Processamento deve registrar `processedAt`.
* Recebimento deve registrar `receivedAt`.

---

## 11. Ordenação de Eventos

Eventos externos podem chegar fora de ordem.

Regras:

* Não assumir que chegada equivale à ocorrência.
* Usar timestamp do provider quando confiável.
* Registrar `receivedAt` e `occurredAt`.
* Evitar sobrescrever estado mais recente com evento antigo.
* Criar lógica de prevenção para status regressivo quando necessário.

---

## 12. Alternativas Consideradas

## 12.1 Usar timezone local do servidor

### Vantagens

* Simples.
* Menos conversão.
* Mais rápido de implementar.

### Desvantagens

* Perigoso em produção.
* Ambíguo.
* Quebra em ambientes com timezone diferente.
* Ruim para multitenancy.
* Pode gerar erros financeiros.

---

## 12.2 Armazenar datas no timezone do tenant

### Vantagens

* Exibição mais simples para o tenant.
* Pode parecer mais natural para relatórios.

### Desvantagens

* Difícil comparar entre tenants.
* Complica eventos globais.
* Complica integrações externas.
* Complica mudanças de timezone.
* Aumenta risco de ambiguidade.

---

## 12.3 Armazenar UTC e exibir localmente

### Vantagens

* Padrão seguro.
* Facilita integrações.
* Facilita auditoria.
* Facilita comparação global.
* Reduz ambiguidade.
* Funciona bem com multitenancy.

### Desvantagens

* Exige conversão para exibição.
* Filtros por período exigem cuidado.
* Relatórios precisam informar timezone.
* Desenvolvedores precisam seguir a regra com disciplina.

---

## 13. Consequências

## 13.1 Positivas

* Menos ambiguidade.
* Melhor auditoria.
* Melhor suporte a múltiplos países.
* Relatórios mais confiáveis.
* Melhor consistência com APIs externas.
* Melhor base para expansão global.

## 13.2 Negativas

* Mais cuidado em filtros.
* Mais cuidado em relatórios.
* Necessidade de helpers de data.
* Necessidade de testes específicos.
* Mais documentação para desenvolvedores.

---

## 14. Testes Necessários

Devem existir testes para:

* Conversão de range local para UTC.
* Filtro “hoje” por timezone.
* Filtro “este mês” por timezone.
* Exibição de data no frontend.
* Relatório com timezone correto.
* Ordenação de eventos.
* Webhook com timestamp externo.
* Expiração de arquivos.
* Expiração de tokens.

---

## 15. Critérios de Validação

Esta decisão será considerada correta se:

* PostgreSQL usar `TIMESTAMPTZ`.
* API retornar ISO 8601.
* Frontend exibir datas no timezone correto.
* Relatórios indicarem timezone.
* Filtros por período respeitarem timezone.
* Eventos possuírem `occurredAt`.
* Auditoria possuir timestamps consistentes.
* Testes cobrirem casos principais.

---

## 16. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O produto exigir regras fiscais específicas por país.
* O sistema passar a operar com data contábil separada de data real.
* O sistema precisar de calendário bancário por país.
* O sistema precisar tratar feriados financeiros.
* O produto virar internacional de fato.

Possíveis evoluções futuras:

* Calendário bancário por país.
* Timezone por usuário.
* Data contábil separada de timestamp.
* Biblioteca especializada para datas.
* Suporte avançado a feriados.
* Fechamento financeiro por competência.
