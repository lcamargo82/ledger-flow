# LedgerFlow Component Library

Documentação dos componentes base do LedgerFlow, guiados pelo UI Blueprint e o design system enterprise.
Toda nova tela no projeto deve ser construída exclusivamente reaproveitando estes componentes.

## 1. AppButton
* **Variantes:** `primary`, `secondary`, `outline`, `ghost`, `danger`, `success`
* **Estados:** `default`, `hover`, `focus`, `disabled`, `loading`

## 2. AppInput
* **Estados:** `default`, `focus` (ring), `error`, `disabled`, `readonly`

## 3. AppPasswordInput
* Extensão de AppInput com funcionalidade *toggle visibility* (exibir/ocultar senha).
* Atributos de acessibilidade (`aria-label`) para o botão de toggle.
* Suporte a `disabled` e `loading`.

## 4. AppSelect
* Componente para seleção customizada ou nativa estilizada para o dark enterprise look.

## 5. AppCard
* Container padrão com `glass-panel` background (rgba(24, 24, 27, 0.4) com backdrop-filter blur).
* Bordas sutis.

## 6. AppTable
* Controle de `columns` e `rows`.
* Estados: `loading`, `empty` (usando AppEmptyState).
* Slots dedicados: `actions` para botões por linha.
* Possui `pagination` integrada ou suporte a componente de paginação externo.

## 7. AppModal
* Sobreposição para formulários e visualização de detalhes (ex: novo usuário).
* Possui overlay translúcido.

## 8. AppConfirmDialog
* Modal simplificado, usado para ações destrutivas ou que exijam confirmação (ex: desativar usuário).

## 9. AppToast
* Notificações não obstrutivas.
* Variantes: `success`, `error`, `warning`, `info`.
* Posição recomendada: `bottom-right`.

## 10. AppBadge
* Rótulos coloridos para status.
* Tipos comuns: `role`, `status` (ativo/inativo), `permission`, `system`.

## 11. AppPageHeader
* Título da página, `description` e um `actions slot` (para botões no canto direito superior, como "Novo Usuário").

## 12. PermissionGate
* Renderiza (ou oculta) blocos de conteúdo no frontend baseando-se nas permissões do usuário logado (ex: `<PermissionGate permission="users:create">`).
* *Nota:* No frontend trata-se exclusivamente de UX. O backend atua como autoridade final.

## 13. Sidebar
* Navegação principal, com menus colapsáveis se necessário.
* Rodapé com: menu do usuário, seletor de idioma, e botão de logout.
* *Nota:* LedgerFlow usa a abordagem AppLayout sem header global, dependendo primariamente do Sidebar.

## 14. AuthHero
* Seção visual de impacto para a tela de login/recuperação.
* Contém a imagem decorativa de background, textos localizados via i18n e ícones gerados via código, não via imagem.
