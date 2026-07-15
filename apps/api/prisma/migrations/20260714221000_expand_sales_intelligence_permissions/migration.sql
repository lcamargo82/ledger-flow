INSERT INTO "permissions" ("id", "key", "description", "scope", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'sales-intelligence:view-profitability', 'Visualizar CMV, lucro e margem por venda', 'TENANT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'sales-intelligence:view-settlement', 'Visualizar settlement e impacto de caixa por venda', 'TENANT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'sales-intelligence:export', 'Exportar inteligência de vendas', 'TENANT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'sales-intelligence:manage-policy', 'Gerenciar políticas e alertas de inteligência de vendas', 'TENANT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE
SET
  "description" = EXCLUDED."description",
  "scope" = 'TENANT',
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles"
CROSS JOIN "permissions"
WHERE roles."key" = 'OWNER'
  AND permissions."key" IN (
    'sales-intelligence:view-profitability',
    'sales-intelligence:view-settlement',
    'sales-intelligence:export',
    'sales-intelligence:manage-policy'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
