sequenceDiagram
    autonumber
    actor User as Usuário
    participant Web as Vue Dashboard
    participant API as NestJS API
    participant PG as PostgreSQL
    participant Outbox as Outbox
    participant Rabbit as RabbitMQ
    participant Worker as Report Worker
    participant FileStorage as Temporary File Storage
    participant Notify as Notification Worker

    User->>Web: Solicita exportação
    Web->>API: POST /reports/export
    API->>API: Valida JWT, tenant e reports:export
    API->>PG: Cria ExportJob PENDING
    API->>Outbox: Cria report.export.requested
    API-->>Web: 202 Accepted
    Web-->>User: Toast: exportação solicitada

    Outbox->>Rabbit: Publica report.export.requested
    Rabbit->>Worker: Consome job
    Worker->>PG: Atualiza ExportJob PROCESSING
    Worker->>PG: Lê dados por cursor/paginação

    alt CSV
        Worker->>FileStorage: Gera CSV via Node.js Streams
    else XLSX
        Worker->>FileStorage: Gera XLSX via ExcelJS streaming
    end

    Worker->>PG: Atualiza ExportJob COMPLETED
    Worker->>Rabbit: Publica notification.created
    Rabbit->>Notify: Consome notificação
    Notify->>PG: Cria notificação in-app
    Notify-->>Web: WebSocket: relatório pronto
    Web-->>User: Toast: relatório pronto para download
```

---

# Arquivo extra recomendado: `docs/diagrams/auth-flow.md`

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuário
    participant Web as Vue Dashboard
    participant API as NestJS API
    participant PG as PostgreSQL
    participant Redis as Redis

    User->>Web: Informa e-mail e senha
    Web->>API: POST /auth/login
    API->>Redis: Verifica rate limit
    API->>PG: Busca usuário por e-mail
    API->>API: Valida senha com hash

    alt Credenciais inválidas
        API-->>Web: 401 UNAUTHORIZED
        Web-->>User: Toast de erro amigável
    else Credenciais válidas
        API->>API: Gera access token
        API->>API: Gera refresh token
        API->>PG: Salva hash do refresh token
        API-->>Web: Tokens + dados do usuário
        Web->>Web: Salva sessão
        Web-->>User: Redireciona para dashboard
    end

    User->>Web: Continua usando sistema
    Web->>API: Request com Bearer Token

    alt Access token válido
        API-->>Web: Resposta protegida
    else Access token expirado
        Web->>API: POST /auth/refresh
        API->>PG: Valida refresh token hash
        API->>API: Gera novo access token
        API-->>Web: Novo access token
    end
