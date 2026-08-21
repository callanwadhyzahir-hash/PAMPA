// Canonical catalog of security_event.event_type values actually emitted by
// SecurityAuditService.record() across the codebase. Used to validate the
// Platform Admin activity feed filters, so unknown/typo'd values 400 instead
// of silently matching nothing.
export const SECURITY_EVENT_TYPES = [
  'TENANT_REGISTERED',
  'LOGIN_SUCCEEDED',
  'LOGIN_FAILED',
  'LOGOUT',
  'LOGOUT_ALL',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'PASSWORD_RESET_DELIVERY_FAILED',
  'PASSWORD_CHANGED',
  'EMAIL_VERIFICATION_SENT',
  'EMAIL_VERIFIED',
  'EMAIL_VERIFICATION_DELIVERY_FAILED',
  'USER_CREATED',
  'USER_DEACTIVATED',
  'USER_ROLES_REPLACED',
  'ROLE_PERMISSIONS_REPLACED',
  'BRANCH_CREATED',
  'BRANCH_UPDATED',
  'BRANCH_DEACTIVATED',
  'STOCK_ADJUSTED',
  'STOCK_TRANSFERRED',
  'COMPANY_SUSPENDED',
  'COMPANY_REACTIVATED',
  'AI_REQUEST',
  'AI_QUOTA_EXCEEDED',
  'AI_COST_LIMIT_EXCEEDED',
  'AI_RATE_LIMITED',
  'AI_PROVIDER_ERROR',
  'AI_SETTINGS_CHANGED',
  'AI_TOOL_CALLED',
  'AI_TOOL_PERMISSION_DENIED',
] as const;

export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

// The subset that answers "who logged in / attempted to" for Platform Admin's
// login-activity view — a filter preset over the same feed, not a parallel
// tracking system.
export const LOGIN_SECURITY_EVENT_TYPES: SecurityEventType[] = [
  'LOGIN_SUCCEEDED',
  'LOGIN_FAILED',
];
