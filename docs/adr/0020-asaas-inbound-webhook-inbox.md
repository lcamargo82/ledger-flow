# 0020 - Asaas Inbound Webhook Inbox

## Status

Aceito

## Contexto

O LedgerFlow, por conta da natureza assíncrona do sistema financeiro (PIX/Boleto), precisa receber atualizações seguras de eventos do gateway (Asaas Sandbox) para sincronizar o status local do `Payment`. A arquitetura base do Payment Core e Multi-Gateway exige uma estratégia que garanta que mensagens repetidas, maliciosas ou fora de ordem não quebrem a consistência nem corrompam os dados do projeto.

O provedor Asaas (e outros gateways do mercado) garante envio "pelo menos uma vez", o que significa que duplicidades são possíveis. Além disso, falhas temporárias podem gerar *retries* no recebimento dos payloads. 

## Decisão

1. **Inbox Pattern Persistido:** Criamos a tabela `WebhookInboxEvent` (com uma chave única em `provider` + `providerEventId`). Todo evento é registrado antes de iniciar o processamento.
2. **Idempotência Garantida:** Se recebermos duas vezes o mesmo `event.id`, o segundo acesso encontra a restrição de banco, registrando uma falha de "duplicate" no log técnico, ignorando a alteração e respondendo `HTTP 200` ao gateway.
3. **Autenticação Direta:** A verificação se dá pela comparação *timing-safe* do header `asaas-access-token` com uma chave secreta (`ASAAS_WEBHOOK_AUTH_TOKEN`). Chaves inválidas retornam 401 sem detalhes adicionais.
4. **Isolamento de Dados Sensíveis:** Não armazenamos o payload bruto do Asaas, mas um `payloadSummary` e um `payloadHash`, evitando que logs e base de dados tornem-se repositórios vulneráveis de dados de clientes (PII) e senhas.
5. **Eventos Desconhecidos Ignorados:** Se o Asaas emitir um evento sem mapeamento ou se o pagamento não for localizado internamente, o evento é persistido e seu status vai para `IGNORED`, retornando 200 para evitar *retries* eternos no Asaas.
6. **Evolução:** Esta versão processa eventos no próprio Request HTTP (Síncrono). O Inbox Pattern foi planejado propositalmente para permitir que, numa futura fase, o processamento seja desacoplado para RabbitMQ e workers de `Dead-Letter Queue`.

## Consequências

- **Positivas:** Recebimento robusto, imune a flood de repetições (ataques ou retries de falha de conexão). Logs e Payload não expõem senhas. O banco controla o status individual.
- **Negativas:** Maior custo de espaço no banco de dados para armazenar cada requisição de `WebhookInboxEvent`. O processamento HTTP síncrono atual pode prender a conexão se o processamento for pesado.
