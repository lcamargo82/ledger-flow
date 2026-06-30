# ADR 0030: Gateway Connections, Credential Management and Feature Access

## Status
Aceito

## Contexto
O LedgerFlow precisava remover o acoplamento rígido com as chaves de API globais dos gateways de pagamento, centralizadas em variáveis de ambiente, para suportar arquiteturas de multi-tenant onde cada tenant pode configurar suas próprias credenciais e opções de pagamento.

Além disso, é necessário garantir que essas credenciais sensíveis (ex: API Keys do Asaas) nunca sejam expostas abertamente, exigindo criptografia robusta. 

Outro desafio que surge com a flexibilidade da plataforma é garantir que determinadas features, como adicionar gateways customizados, possam ser limitadas de acordo com o plano do cliente.

## Decisão

1. **Gestão Descentralizada de Gateways**:
   Criada a estrutura `GatewayConfiguration` vinculada ao Tenant. Através desta estrutura, o próprio tenant (ou usuários com permissão) pode configurar e gerir múltiplos provedores (ex: Asaas, Mercado Pago).

2. **Criptografia Simétrica (AES-256-GCM)**:
   Decidimos utilizar AES-256-GCM com chave-mestra configurada no ambiente (variável `ENCRYPTION_KEY` ou `GATEWAY_CREDENTIALS_ENCRYPTION_KEY`) para criptografar as credenciais (`apiKey`, `secret`, etc) antes de armazenar no banco. 
   O formato do payload encriptado agora utiliza um JSON estruturado (`{"version": 1, "algorithm": "aes-256-gcm", "iv": "...", "authTag": "...", "ciphertext": "..."}`) em vez da antiga concatenação por dois-pontos. Um fallback de descriptografia legacy foi mantido.
   Além disso, o serviço agora impõe a "validação round-trip" (criptografar e, em seguida, descriptografar e comparar antes de persistir) para mitigar eventuais corrupções de chave por codificações indevidas. O hash (fingerprint) é mantido para detecção de duplicidade ou validação.

3. **Gerenciamento Seguro do Ciclo de Vida da Conexão**:
   A credencial antiga nunca é exposta na UI. Atualizações sobrescrevem a credencial. Existe também a opção de desconectar permanentemente (`disconnect`), o que destrói a chave e o fingerprint, forçando que novas cobranças aguardem por uma reconfiguração completa.

4. **Tratamento de Credencial Inválida no Worker**:
   Em caso de falha ao descriptografar no processamento assíncrono (ex: Worker tentando cobrar uma chave recém invalidada ou corrompida), lança-se a exceção customizada `GatewayCredentialsInvalidError`, mapeada para o fluxo de `NonRetryableAsyncJobError`, marcando a task como `DEAD_LETTERED` e evitando retry loop infinito.

5. **Controle de Acessos com TenantFeatureAccessService**:
   Para limitar o acesso baseado em "Features", implementamos a interface `ITenantFeatureAccessService`. Por ora, ela possui uma lógica baseada em whitelist de slugs ou mock hardcoded que libera acesso completo para tenants de demonstração (ex: o tenant seed `lcamargo82-ledger-flow`). Futuramente, este serviço será conectado a um módulo de assinatura.

6. **Escopos de Permissão Isolados**:
   O sistema de roles recebeu novos escopos de permissões:
   - Tenant: `gateways:read`, `gateways:create`, `gateways:update`, `gateways:manage`
   - Plataforma: `platform:gateways:read`, `platform:gateways:status`
   Dessa forma, o owner do tenant pode definir quem acessa a configuração. A equipe do platform admin pode visualizar e intervir suspendendo conexões prejudiciais sem ter acesso à `apiKey` descriptografada.

## Consequências

### Positivas
- A plataforma está apta para uso real B2B onde cada cliente gerencia seus parceiros de pagamento.
- Segurança superior impedindo vazamento de secrets de gateway (em logs, repositórios ou banco exposto) e garantindo integridade e versionamento por JSON.
- Resiliência aumentada em processamentos assíncronos contra loops infinitos de erro de credencial.
- Arquitetura plugável pronta para a integração de novos provedores.

### Negativas / Riscos
- A rotação da chave de criptografia master do AES exige um processo massivo de migração dos registros de banco de dados e deve ser manuseada com extremo cuidado.
- Ligeiro overhead de CPU no servidor decorrente de encriptação e descriptografia contínua.
