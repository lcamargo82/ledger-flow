const fs = require('fs');
const path = require('path');

function appendToFile(filePath, text) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    fs.appendFileSync(fullPath, `\n\n${text}\n`);
    console.log(`Updated ${filePath}`);
  }
}

appendToFile('docs/adr/0009-frontend-architecture.md', '### Atualização (Fase 3D)\nReforçada a obrigatoriedade de uso do sistema i18n com objetos aninhados e reaproveitamento de componentes base (como AppModal, AppTable, UserForm) para todas as telas administrativas.');
appendToFile('docs/adr/0012-api-documentation-strategy.md', '### Atualização (Fase 3D)\nFica estritamente estabelecido que **todos os endpoints administrativos** (Users, Roles, Permissions, Tenants) devem possuir documentação OpenAPI com os devidos decorators de autenticação, resposta e sumário, evitando exposição de dados sensíveis em DTOs.');
appendToFile('docs/adr/0013-authentication-and-authorization.md', '### Atualização (Fase 3D)\nReforço sobre o modelo RBAC: todas as operações de escrita em entidades administrativas (Users, Roles, Permissions, Tenant Settings) devem validar a role no backend via `@RequirePermissions` (ex: `users:create`, `roles:manage`). O frontend apenas reflete a UX através do `PermissionGate` ou validação do store, sem substituir a checagem no backend.');
appendToFile('docs/adr/0016-security-and-secrets-management.md', '### Atualização (Fase 3D)\nÉ terminantemente proibido retornar senhas temporárias (`temporaryPassword`), `passwordHash`, `tokenHash` ou chaves inteiras em listagens ou detalhes de usuários/tenants. Todos os DTOs administrativos (ex: `UserDetailsResponseDto`) devem omitir e sanitizar essas propriedades rigorosamente.');

const backlogPath = path.join(__dirname, '../docs/backlog.md');
let backlog = fs.readFileSync(backlogPath, 'utf8');
backlog = backlog.replace('## LF-017 — Gestão de Usuários (Fase 3)', '## LF-017 — Gestão de Usuários (Fase 3)\n\n### Subtasks Adicionais (Fase 3D)\n* [x] create user\n* [x] update user\n* [x] activate/deactivate user\n* [x] update user roles\n* [x] list roles\n* [x] list permissions\n* [x] tenant settings\n* [x] i18n admin fixes\n');
fs.writeFileSync(backlogPath, backlog);
console.log('Updated backlog.md');

