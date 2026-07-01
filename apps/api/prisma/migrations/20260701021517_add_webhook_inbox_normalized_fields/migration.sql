-- AlterTable
ALTER TABLE "webhook_inbox_events" ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "providerPaymentId" TEXT,
ADD COLUMN     "providerPaymentStatus" TEXT;
