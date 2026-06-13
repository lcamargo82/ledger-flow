# ADR-0010 — Governança de Dependências e Política de Bibliotecas Terceiras

**Status:** Aceito
**Data:** 2026-06-12
**Projeto:** LedgerFlow — Enterprise Payment, Reconciliation & Observability Platform

---

## 1. Contexto

O LedgerFlow será desenvolvido com uma stack moderna baseada em Node.js, NestJS, Vue 3, TypeScript, Prisma, RabbitMQ, Redis, MongoDB, PostgreSQL, Tailwind e ferramentas de observabilidade.

Projetos Node.js costumam depender de várias bibliotecas externas. Isso acelera o desenvolvimento, mas também pode introduzir riscos:

* Dependências abandonadas.
* Vulnerabilidades conhecidas.
* Pacotes sem manutenção.
* Pacotes com baixa adoção.
* Pacotes com documentação ruim.
* Pacotes desnecessários.
* Risco de supply chain attack.
* Aumento excessivo do bundle frontend.
* Quebras causadas por atualizações incompatíveis.
* Licenças inadequadas para uso futuro.

Como o LedgerFlow simula um sistema corporativo financeiro, a escolha de dependências precisa seguir uma política mais rígida.

---

## 2. Decisão

O LedgerFlow adotará uma política formal de governança de dependências.

A instalação de qualquer biblioteca externa deve respeitar critérios mínimos de segurança, manutenção e necessidade real.

A regra principal será:

> Não utilizar bibliotecas abandonadas, sem atualização relevante nos últimos 12 meses ou com vulnerabilidades conhecidas de severidade alta/crítica.

---

## 3. Regras Gerais

Antes de instalar uma dependência, verificar:

1. Se a biblioteca é realmente necessária.
2. Se é mantida ativamente.
3. Se recebeu atualizações nos últimos 12 meses.
4. Se possui documentação clara.
5. Se possui adoção razoável pela comunidade.
6. Se possui issues críticas sem resposta.
7. Se possui vulnerabilidades high ou critical.
8. Se é compatível com a versão atual da stack.
9. Se não aumenta demais o bundle frontend.
10. Se possui licença adequada.

---

## 4. Critérios de Bloqueio

Uma biblioteca não deve ser instalada se:

* Não recebe atualização há mais de 12 meses.
* Possui vulnerabilidade high ou critical sem correção.
* Possui histórico conhecido de comprometimento.
* Não possui documentação mínima.
* Não possui repositório público ou rastreável.
* Possui muitos bugs críticos abertos sem manutenção.
* É substituível por API nativa da plataforma.
* É usada para algo simples que poderia ser implementado internamente com baixo risco.
* Introduz dependências transitivas excessivas sem justificativa.

---

## 5. Critérios de Aceitação

Uma biblioteca pode ser considerada aceitável se:

* É mantida ativamente.
* É amplamente usada.
* Possui documentação clara.
* Possui boa compatibilidade com TypeScript.
* Possui baixa incidência de vulnerabilidades.
* Possui licença adequada.
* Resolve um problema relevante.
* Reduz complexidade sem comprometer segurança.
* Tem comunidade ativa.
* Tem histórico de releases consistente.

---

## 6. Ferramentas de Governança

O projeto deverá utilizar ferramentas para reduzir riscos.

Ferramentas sugeridas:

```text
npm audit
Dependabot ou Renovate
CodeQL
Secret scanning
ESLint
Prettier
Husky
lint-staged
Commitlint
```

---

## 7. npm audit

O pipeline deve executar auditoria de dependências.

Regra:

```text
Vulnerabilidades high ou critical devem bloquear merge/deploy.
```

Vulnerabilidades low ou moderate devem ser avaliadas caso a caso.

---

## 8. Dependabot ou Renovate

O projeto deverá usar ferramenta automatizada para sugerir atualizações de dependências.

Objetivos:

* Manter bibliotecas atualizadas.
* Reduzir risco de vulnerabilidades antigas.
* Evitar acúmulo de upgrades grandes.
* Melhorar manutenção contínua.

Critérios:

* Pull requests de atualização devem rodar testes.
* Atualizações major devem ser revisadas com cuidado.
* Atualizações de segurança devem ter prioridade.

---

## 9. CodeQL e Secret Scanning

O projeto deverá utilizar análise estática e detecção de segredos.

Objetivos:

* Detectar padrões inseguros.
* Detectar secrets commitados por engano.
* Detectar vulnerabilidades de código.
* Aumentar maturidade de segurança do repositório.

---

## 10. Política para Dependências Frontend

No frontend, além da segurança, considerar impacto no bundle.

Regras:

* Evitar bibliotecas grandes para funcionalidades simples.
* Preferir tree-shaking.
* Importar apenas o necessário.
* Evitar pacotes de UI pesados sem justificativa.
* Preferir componentes próprios quando fizer sentido.
* Usar Heroicons com importação nomeada.
* Evitar dependências que prejudiquem performance inicial.

Exemplo correto:

```typescript
import { CheckIcon } from '@heroicons/vue/24/solid';
```

Evitar importar pacote inteiro desnecessariamente.

---

## 11. Política para Dependências Backend

No backend, considerar segurança e confiabilidade.

Regras:

* Evitar pacotes sem tipagem ou sem suporte TypeScript.
* Evitar bibliotecas que manipulam criptografia sem reputação forte.
* Preferir SDK oficial para gateways quando disponível.
* Preferir bibliotecas maduras para observabilidade, logs e filas.
* Evitar pacotes que mascaram comportamento crítico.
* Validar compatibilidade com NestJS.

---

## 12. Dependências que Exigem ADR

Algumas dependências relevantes devem ser justificadas via ADR ou seção técnica no SDD.

Exemplos:

* Prisma.
* RabbitMQ client.
* Redis client.
* OpenTelemetry.
* Pino.
* ExcelJS.
* Bibliotecas de autenticação.
* Bibliotecas de criptografia.
* Bibliotecas de documentação.
* Bibliotecas de teste de carga.
* Bibliotecas de validação.

---

## 13. Alternativas Consideradas

## 13.1 Instalar bibliotecas livremente

### Vantagens

* Desenvolvimento mais rápido.
* Menos burocracia.
* Mais facilidade para experimentar.

### Desvantagens

* Risco de segurança.
* Acúmulo de dependências desnecessárias.
* Bundle maior.
* Maior risco de pacote abandonado.
* Menor maturidade corporativa.

---

## 13.2 Usar poucas bibliotecas externas

### Vantagens

* Menor superfície de ataque.
* Menor dependência externa.
* Mais controle.

### Desvantagens

* Mais código próprio para manter.
* Maior chance de reinventar soluções.
* Pode atrasar desenvolvimento.
* Pode gerar implementações inferiores às bibliotecas maduras.

---

## 13.3 Governança equilibrada

### Vantagens

* Mantém produtividade.
* Reduz risco.
* Evita pacotes abandonados.
* Melhora segurança.
* Demonstra maturidade enterprise.
* Mantém stack sustentável.

### Desvantagens

* Exige verificação antes de instalar.
* Pode atrasar pequenas decisões.
* Exige manutenção contínua.
* Exige documentação para dependências críticas.

---

## 14. Consequências

## 14.1 Positivas

* Menor risco de vulnerabilidades.
* Menor risco de dependências abandonadas.
* Código mais sustentável.
* Melhor qualidade do portfólio.
* Melhor aderência a práticas corporativas.
* Maior confiança na stack.

## 14.2 Negativas

* Mais trabalho antes de instalar bibliotecas.
* Mais manutenção no CI.
* Mais PRs de atualização.
* Possível atraso em features simples.
* Exige disciplina contínua.

---

## 15. Critérios de Validação

Esta decisão será considerada correta se:

* Nenhuma dependência abandonada for adicionada sem justificativa.
* Vulnerabilidades high/critical bloquearem merge.
* Dependabot ou Renovate estiver configurado.
* npm audit rodar no pipeline.
* CodeQL ou ferramenta equivalente estiver configurada.
* Dependências críticas forem documentadas.
* O README mencionar a política de dependências.
* O projeto mantiver build e testes após updates.

---

## 16. Possível Revisão Futura

Esta decisão poderá ser revista se:

* O projeto migrar para outro gerenciador de pacotes.
* O projeto adotar monorepo com workspaces avançados.
* O sistema virar produto comercial.
* Houver exigência formal de compliance.
* A equipe crescer e exigir processo de aprovação mais rígido.

Possíveis evoluções futuras:

* Renovate com regras automáticas.
* Software Bill of Materials.
* Snyk.
* OWASP Dependency-Check.
* Política de licenças.
* Bloqueio automático por idade do pacote.
* Aprovação obrigatória para pacotes novos.
