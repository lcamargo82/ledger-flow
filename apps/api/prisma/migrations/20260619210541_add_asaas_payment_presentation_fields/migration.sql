-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "providerBankSlipUrl" TEXT,
ADD COLUMN     "providerInvoiceUrl" TEXT,
ADD COLUMN     "providerPaymentUrl" TEXT,
ADD COLUMN     "providerPixCopyPaste" TEXT,
ADD COLUMN     "providerPixExpiresAt" TIMESTAMP(3);
