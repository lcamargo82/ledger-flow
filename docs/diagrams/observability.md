flowchart TB
    USER[User]
    WEB[Vue 3 Web App]
    API[NestJS API]
    WORKERS[NestJS Workers]
    RABBIT[RabbitMQ]
    POSTGRES[(PostgreSQL)]
    MONGO[(MongoDB)]
    REDIS[(Redis)]
    STRIPE[Stripe API]
    CLIENTS[Client Systems]

    OTEL[OpenTelemetry SDK]
    LOGS[Structured JSON Logs]
    PROM[Prometheus]
    GRAFANA[Grafana]
    DATADOG[Datadog Optional]

    USER --> WEB
    WEB -->|HTTP/WebSocket| API
    API --> POSTGRES
    API --> MONGO
    API --> REDIS
    API --> RABBIT
    API --> STRIPE
    RABBIT --> WORKERS
    WORKERS --> POSTGRES
    WORKERS --> MONGO
    WORKERS --> REDIS
    WORKERS --> CLIENTS

    API -->|Spans| OTEL
    WORKERS -->|Spans| OTEL
    API -->|JSON logs with traceId| LOGS
    WORKERS -->|JSON logs with traceId| LOGS

    API -->|/metrics| PROM
    WORKERS -->|/metrics| PROM
    RABBIT -->|queue metrics| PROM
    POSTGRES -->|db metrics| PROM
    REDIS -->|cache metrics| PROM

    PROM --> GRAFANA
    OTEL -. optional export .-> DATADOG
    LOGS -. optional correlation .-> DATADOG

    GRAFANA --> DASH1[API Health Dashboard]
    GRAFANA --> DASH2[Payments Business Dashboard]
    GRAFANA --> DASH3[RabbitMQ Dashboard]
    GRAFANA --> DASH4[Webhook Delivery Dashboard]
    GRAFANA --> DASH5[Reports Export Dashboard]
    