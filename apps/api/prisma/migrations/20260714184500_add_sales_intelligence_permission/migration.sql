INSERT INTO "permissions" ("id", "key", "description", "scope", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'sales-intelligence:read',
  'Visualizar inteligência de vendas consolidada',
  'TENANT',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
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
  AND permissions."key" = 'sales-intelligence:read'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
