# LedgerFlow UI Reference

Este diretório (`docs/html/`) contém os arquivos HTML exportados que servem como referência principal para o layout, design system e fluxo de telas (UI Blueprint) do LedgerFlow.

## Arquivos de Referência

Os seguintes arquivos estão disponíveis na pasta `docs/html/`:

* `403.html` - Referência para a tela de acesso negado (Forbidden).
* `components.html` - Biblioteca de componentes base e padrões visuais.
* `dashboard.html` - Referência visual para o layout principal do Dashboard.
* `login.html` - Referência para a tela de Login (AuthLayout).
* `novo_usuario.html` - Referência para o modal/tela de criação de usuário.
* `permission.html` - Referência para a listagem e gerenciamento de permissões.
* `recuperar_senha.html` - Referência para o fluxo de solicitação de redefinição de senha (Forgot Password).
* `roles.html` - Referência para a listagem e gerenciamento de Roles.
* `tenant.html` - Referência para configurações do Tenant (Organization Settings).
* `usuarios.html` - Referência para a listagem de usuários com tabela e filtros.

## Observações

- A documentação detalhada sobre o uso dessas telas e seus componentes está nos arquivos `docs/ui-*.md` na raiz da pasta `docs`.
- Estas telas servem estritamente como **referência de design, estrutura HTML (Tailwind) e classes**.
- Todo código que for migrado dessas referências para o Vue deverá ser componentizado de acordo com o `docs/ui-components.md`.
