INSERT INTO "permissions" ("id", "key", "description", "scope", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'inventory:transfer', 'Gerenciar transferências de estoque', 'TENANT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'inventory:cycle-count', 'Gerenciar inventários cíclicos', 'TENANT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'inventory:approve', 'Aprovar ajustes de inventário físico', 'TENANT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'inventory:alerts-manage', 'Gerenciar alertas de estoque', 'TENANT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'inventory:aging-read', 'Visualizar aging de estoque', 'TENANT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'inventory:kits-manage', 'Gerenciar kits de estoque', 'TENANT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE
SET "description" = EXCLUDED."description", "scope" = 'TENANT', "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), roles."id", permissions."id", CURRENT_TIMESTAMP
FROM "roles"
CROSS JOIN "permissions"
WHERE roles."key" = 'OWNER'
  AND permissions."key" IN (
    'inventory:transfer',
    'inventory:cycle-count',
    'inventory:approve',
    'inventory:alerts-manage',
    'inventory:aging-read',
    'inventory:kits-manage'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
