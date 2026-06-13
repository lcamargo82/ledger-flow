# ADR-0014 — Estratégia de Exportação de Relatórios com CSV, XLSX, Streams e Processamento Assíncrono

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow precisa permitir que usuários exportem dados financeiros, transações, clientes, webhooks, relatórios operacionais e registros de auditoria.

Essas exportações podem variar muito em tamanho.

Exemplos:

* 100 pagamentos do mês atual.
* 10.000 pagamentos de um período.
* 500.000 transações históricas.
* Milhões de registros em um tenant grande.
* Logs de webhooks com múltiplas tentativas.
* Relatórios financeiros para conciliação.

Se o sistema tentar carregar todos os registros em memória antes de gerar um arquivo, poderá ocorrer:

* Alto consumo de RAM.
* Lentidão.
* Timeout HTTP.
* Travamento do worker.
* Instabilidade no servidor.
* Experiência ruim para o usuário.

Sistemas corporativos costumam tratar exportações grandes como jobs assíncronos, com status, notificação e download posterior.

---

## 2. Decisão

O LedgerFlow adotará uma estratégia híbrida:

1. Exportações pequenas poderão ser síncronas.
2. Exportações grandes serão obrigatoriamente assíncronas.
3. CSV será gerado com Node.js Streams.
4. XLSX será gerado com ExcelJS em modo streaming.
5. Jobs de exportação serão persistidos em `export_jobs`.
6. O usuário será notificado quando o relatório estiver pronto.
7. Arquivos terão expiração.
8. Exportações respeitarão tenant, permissões e timezone.

---

## 3. Tipos de Exportação

Formatos suportados inicialmente:

```text
CSV
XLSX
```

Tipos de relatórios:

```text
payments
customers
webhook_deliveries
audit_logs
financial_summary
```

---

## 4. Exportação Síncrona

Exportação síncrona só será permitida para volumes pequenos.

Exemplo de limite inicial:

```text
Até 10.000 registros
```

Regras:

* Deve respeitar timeout da API.
* Deve usar paginação/cursor internamente.
* Deve respeitar tenant.
* Deve respeitar permissões.
* Deve registrar auditoria.
* Deve informar timezone usado.

---

## 5. Exportação Assíncrona

Exportações acima do limite definido devem virar job.

Fluxo:

```text
Usuário solicita relatório
  ↓
Backend valida permissões
  ↓
Backend cria export_job
  ↓
Backend publica report.export.requested
  ↓
Worker processa relatório
  ↓
Arquivo é gerado
  ↓
Job muda para COMPLETED
  ↓
Usuário recebe notificação
  ↓
Usuário faz download
```

---

## 6. Modelo ExportJob

Campos sugeridos:

```text
id
tenantId
userId
type
format
status
filters
filePath
fileSize
totalRows
errorMessage
expiresAt
createdAt
updatedAt
startedAt
completedAt
```

Status:

```text
PENDING
PROCESSING
COMPLETED
FAILED
EXPIRED
```

---

## 7. CSV com Node.js Streams

CSV deve ser gerado sem carregar todos os registros em memória.

Fluxo:

```text
Cursor/paginação do banco
  ↓
Transform Stream
  ↓
Write Stream
  ↓
Arquivo temporário ou response
```

Regras:

* Escrever cabeçalho.
* Escrever linhas em chunks.
* Evitar array gigante em memória.
* Controlar backpressure.
* Tratar erros da stream.
* Registrar status do job.

---

## 8. XLSX com ExcelJS Streaming

Para XLSX, será utilizado:

```text
ExcelJS.stream.xlsx.WorkbookWriter
```

Regras:

* Criar workbook em modo streaming.
* Commitar linhas individualmente.
* Não montar todo workbook em memória.
* Commitar worksheet.
* Commitar workbook.
* Validar abertura do arquivo gerado.
* Não usar abordagem que carregue todas as linhas na RAM.

---

## 9. Permissões

Exportações devem exigir permissões específicas.

Exemplos:

```text
reports:export
payments:read
audit:read
webhooks:read
```

Regras:

* Usuário sem permissão não exporta.
* Exportação deve respeitar tenant.
* Exportação de auditoria pode exigir permissão mais elevada.
* Exportação pesada deve exigir modal de confirmação.
* Ação deve gerar auditoria.

---

## 10. Timezone

Relatórios devem informar o timezone usado.

Exemplo:

```text
Período: 01/06/2026 00:00 até 12/06/2026 23:59
Timezone: America/Sao_Paulo
Gerado em: 2026-06-12T18:30:00.000Z
```

Regras:

* Filtros por período devem considerar timezone do tenant/usuário.
* Arquivo deve deixar claro se datas estão em UTC ou horário local.
* Relatórios financeiros devem evitar ambiguidade de data.

---

## 11. Notificações

Quando uma exportação assíncrona for concluída:

* Criar notificação in-app.
* Enviar e-mail, se configurado.
* Exibir toast no frontend, se usuário estiver online.
* Disponibilizar link de download.

Evento:

```text
report.ready
```

---

## 12. Retenção e Expiração

Arquivos gerados devem ter expiração.

Exemplo inicial:

```text
7 dias
```

Regras:

* Job deve possuir `expiresAt`.
* Arquivo expirado deve ser removido.
* Download após expiração deve retornar erro amigável.
* Limpeza pode ser feita por worker agendado.
* Política de retenção deve ser documentada.

---

## 13. Alternativas Consideradas

## 13.1 Gerar tudo em memória

### Vantagens

* Simples.
* Rápido para poucos registros.
* Menos infraestrutura.

### Desvantagens

* Não escala.
* Pode estourar memória.
* Pode causar timeout.
* Ruim para grandes volumes.
* Não demonstra maturidade enterprise.

---

## 13.2 Apenas CSV

### Vantagens

* Mais simples.
* Stream nativo mais fácil.
* Arquivos menores.
* Melhor para grandes volumes.

### Desvantagens

* Usuários de negócio frequentemente esperam Excel.
* Menor experiência para relatórios corporativos.
* Pode ser menos amigável.

---

## 13.3 CSV + XLSX com streaming

### Vantagens

* Suporta grande volume.
* Atende usuários técnicos e de negócio.
* Evita estouro de memória.
* Demonstra conhecimento de streams.
* Mais próximo de sistemas reais.

### Desvantagens

* Mais complexo.
* XLSX streaming exige cuidado.
* Arquivos temporários precisam ser gerenciados.
* Exige worker e status de job.

---

## 14. Consequências

## 14.1 Positivas

* Exportações grandes não travam a API.
* Melhor experiência do usuário.
* Melhor controle de processamento.
* Permite notificação quando pronto.
* Demonstra maturidade técnica.
* Reduz risco de timeout e estouro de memória.

## 14.2 Negativas

* Mais entidades.
* Mais workers.
* Mais telas.
* Mais controle de arquivos.
* Mais testes necessários.
* Mais política de retenção.

---

## 15. Observabilidade

Métricas recomendadas:

* Total de exportações solicitadas.
* Exportações concluídas.
* Exportações com falha.
* Tempo médio de geração.
* Tamanho médio dos arquivos.
* Número médio de linhas.
* Exportações por tenant.
* Falhas por tipo de relatório.
* Jobs expirados.
* Jobs em processamento.

Logs devem conter:

```json
{
  "traceId": "01HZ...",
  "tenantId": "tenant-id",
  "userId": "user-id",
  "exportJobId": "job-id",
  "type": "payments",
  "format": "xlsx",
  "status": "COMPLETED",
  "totalRows": 150000
}
```

---

## 16. Segurança

Regras:

* Exportação deve respeitar tenant.
* Exportação deve respeitar permissões.
* Arquivo não deve ser público sem controle.
* Link de download deve expirar.
* Dados sensíveis devem ser mascarados quando necessário.
* Exportação deve gerar auditoria.
* Downloads devem ser auditados.
* Usuário não pode baixar arquivo de outro tenant.

---

## 17. Critérios de Validação

Esta decisão será considerada correta se:

* CSV for gerado via stream.
* XLSX for gerado com ExcelJS streaming.
* Exportação grande for assíncrona.
* Job possuir status rastreável.
* Usuário for notificado quando pronto.
* Arquivo expirar.
* Exportação respeitar tenant e permissões.
* Processo não carregar todos os registros em memória.
* Testes com volume alto forem executados.
* README documentar fluxo de exportação.

---

## 18. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O sistema adotar storage externo.
* O volume exigir processamento distribuído.
* O produto comercial exigir retenção maior.
* Relatórios precisarem de agendamento.
* Relatórios precisarem ser enviados automaticamente.

Possíveis evoluções futuras:

* S3-compatible storage.
* Relatórios agendados.
* Relatórios recorrentes.
* Envio automático por e-mail.
* Compressão ZIP.
* Exportação Parquet.
* Data warehouse.
* BI integrado.
