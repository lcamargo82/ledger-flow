-- CreateEnum
CREATE TYPE "PaymentExecutionMode" AS ENUM ('EXTERNAL_GATEWAY', 'MANUAL', 'INTERNAL');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "executionMode" "PaymentExecutionMode" NOT NULL DEFAULT 'EXTERNAL_GATEWAY';

-- Set MANUAL mode for existing payments without provider/gateway
UPDATE "payments" SET "executionMode" = 'MANUAL' WHERE "gatewayConfigurationId" IS NULL AND "provider" IS NULL;

