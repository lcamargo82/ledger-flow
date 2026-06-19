# LedgerFlow UI Refactor Plan

Este plano descreve os próximos passos da implementação das referências visuais e novas funcionalidades no frontend do LedgerFlow.

## Fase UI-1 — LedgerFlow UI Blueprint & Screen Flow
**Status:** Em execução/Concluída (este documento e os demais `docs/ui-*.md`).

## Fase UI-2 — Refatoração das Telas Existentes
O objetivo da Fase UI-2 é reconstruir e alinhar as páginas atuais usando as especificações contidas no pacote HTML (UI Blueprint), focando puramente em estética e componentização, sem alterar a regra de negócio.

**Escopo:**
* **AppLayout** e **Sidebar:** Alinhamento de cores e do layout de navegação; implementação do rodapé do sidebar.
* **Login:** Atualização da página com o `AuthLayout` e `AuthHero`.
* **Forgot Password:** Implementar interface de placeholder visual (ainda sem requisição real ao backend).
* **Dashboard:** Aplicar o novo layout e cards (dados podem seguir os mocks provisórios).
* **Users:** Alinhamento da tabela, paginação, modais e botões com os padrões visuais; aplicar o filtro visual.
* **Roles:** Alinhamento da tabela e detalhes da role.
* **Permissions:** Alinhamento da tabela de visualização.
* **Tenant Settings:** Atualização do formulário visual com os estilos do `AppCard` e inputs.
* **Forbidden & Not Found:** Telas simples utilizando o padrão visual e CTAs para voltar à Home.
* **Component Library:** Extração e implementação dos componentes de base.

## Fase 4A.1 — Password Recovery Frontend
**Status:** Concluída (Implementado fluxo de envio de token e criação de nova senha).
Integração do frontend com as rotas reais de redefinição de senha da API, com segurança.

**Escopo:**
* Criação efetiva da view/fluxo **Forgot Password** conectada em `POST /auth/forgot-password`.
* Criação efetiva da view **Reset Password** conectada em `POST /auth/reset-password`.
* Refinamento dos estados de Sucesso e Erro com `AppToast` e `AppAlert`.
* i18n implementado corretamente.
* Garantia de resposta genérica: nunca revelar existência de e-mail cadastrado na UI.

## Fase 4B — Customers Frontend
Nova funcionalidade do LedgerFlow voltada ao gerenciamento de clientes/empresas para a camada transacional.

**Status:** Concluída

**Escopo:**
* `CustomersView`
* `CustomersStore` e `CustomersService`
* `CustomerForm` (Criação e Edição)
* `CustomerDetails` (Visualização)
* Ações de alterar o status: Ativar/Inativar (com `AppConfirmDialog`).
* Paginação via API e tabela (utilizando `AppTable`).
* i18n para as telas de cliente.
* Validação de permissões: `customers:read`, `customers:create`, `customers:update`.
