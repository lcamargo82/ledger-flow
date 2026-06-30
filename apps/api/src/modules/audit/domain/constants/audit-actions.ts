export const AuditActions = {
  // Platform
  PLATFORM_TENANT_CREATED: 'platform.tenant.created',
  PLATFORM_TENANT_UPDATED: 'platform.tenant.updated',
  PLATFORM_TENANT_ACTIVATED: 'platform.tenant.activated',
  PLATFORM_TENANT_DEACTIVATED: 'platform.tenant.deactivated',
  PLATFORM_SUBSCRIPTION_UPDATED: 'platform.subscription.updated',
  PLATFORM_TENANT_INVITATION_CREATED: 'platform.tenant.invitation_created',
  PLATFORM_TENANT_INVITATION_RESENT: 'platform.tenant.invitation_resent',
  PLATFORM_TENANT_INVITATION_ACCEPTED: 'platform.tenant.invitation_accepted',

  // Gateway
  GATEWAY_CONFIGURATION_CREATED: 'gateway.configuration.created',
  GATEWAY_CONFIGURATION_UPDATED: 'gateway.configuration.updated',
  GATEWAY_CONFIGURATION_ACTIVATED: 'gateway.configuration.activated',
  GATEWAY_CONFIGURATION_DEACTIVATED: 'gateway.configuration.deactivated',
  GATEWAY_CONFIGURATION_HEALTH_CHANGED: 'gateway.configuration.health_changed',

  // Payment
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_CANCELED: 'payment.canceled',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYMENT_PROVIDER_CHARGE_CREATED: 'payment.provider_charge_created',
  PAYMENT_PROVIDER_CHARGE_LINKED: 'payment.provider_charge_linked',
  PAYMENT_PROVIDER_CREATION_FAILED: 'payment.provider_creation_failed',
  PAYMENT_PROVIDER_STATUS_UPDATED: 'payment.provider_status_updated',
  PAYMENT_PROVIDER_PAYMENT_APPROVED: 'payment.provider_payment_approved',
  PAYMENT_PROVIDER_PAYMENT_FAILED: 'payment.provider_payment_failed',
  PAYMENT_PROVIDER_PAYMENT_REFUNDED: 'payment.provider_payment_refunded',
  PAYMENT_PROVIDER_PAYMENT_CANCELED: 'payment.provider_payment_canceled',

  // Webhook
  WEBHOOK_RECEIVED: 'webhook.received',
  WEBHOOK_PROCESSED: 'webhook.processed',
  WEBHOOK_IGNORED: 'webhook.ignored',
  WEBHOOK_FAILED: 'webhook.failed',

  // Security/Auth
  AUTH_LOGIN_SUCCEEDED: 'auth.login_succeeded',
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  AUTH_PASSWORD_RECOVERY_REQUESTED: 'auth.password_recovery_requested',
  AUTH_PASSWORD_RESET_COMPLETED: 'auth.password_reset_completed',
  AUTH_TENANT_INVITATION_ACCEPTED: 'auth.tenant_invitation_accepted',

  // Support
  PLATFORM_SUPPORT_NOTE_CREATED: 'platform.support.note_created',
  PLATFORM_SUPPORT_TENANT_STATUS_REVIEWED: 'platform.support.tenant_status_reviewed',
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];
