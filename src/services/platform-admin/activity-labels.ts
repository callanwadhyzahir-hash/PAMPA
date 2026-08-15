// Human-readable presentation for security_event.event_type values.
// Kept on the frontend deliberately: the backend catalog
// (pampa-api/src/modules/auth/audit/security-event-types.ts) only needs the
// raw type strings for validation, not Spanish copy.
export const ACTIVITY_EVENT_LABELS: Record<string, string> = {
  TENANT_REGISTERED: "Empresa registrada",
  LOGIN_SUCCEEDED: "Inicio de sesión exitoso",
  LOGIN_FAILED: "Inicio de sesión fallido",
  LOGOUT: "Cierre de sesión",
  LOGOUT_ALL: "Cierre de todas las sesiones",
  PASSWORD_RESET_REQUESTED: "Recuperación de contraseña solicitada",
  PASSWORD_RESET_COMPLETED: "Contraseña restablecida",
  PASSWORD_RESET_DELIVERY_FAILED: "Falla al enviar email de recuperación",
  PASSWORD_CHANGED: "Contraseña cambiada",
  EMAIL_VERIFICATION_SENT: "Email de verificación enviado",
  EMAIL_VERIFIED: "Email verificado",
  EMAIL_VERIFICATION_DELIVERY_FAILED: "Falla al enviar email de verificación",
  USER_CREATED: "Usuario creado",
  USER_DEACTIVATED: "Usuario desactivado",
  USER_ROLES_REPLACED: "Roles de usuario modificados",
  ROLE_PERMISSIONS_REPLACED: "Permisos de rol modificados",
  BRANCH_CREATED: "Sucursal creada",
  BRANCH_UPDATED: "Sucursal modificada",
  BRANCH_DEACTIVATED: "Sucursal desactivada",
  STOCK_ADJUSTED: "Stock ajustado",
  STOCK_TRANSFERRED: "Stock transferido",
  COMPANY_SUSPENDED: "Empresa suspendida",
  COMPANY_REACTIVATED: "Empresa reactivada",
};

export function activityEventLabel(eventType: string): string {
  return ACTIVITY_EVENT_LABELS[eventType] ?? eventType;
}

export const LOGIN_ACTIVITY_EVENT_TYPES = ["LOGIN_SUCCEEDED", "LOGIN_FAILED"];

export const EMAIL_DELIVERY_FAILURE_EVENT_TYPES = [
  "EMAIL_VERIFICATION_DELIVERY_FAILED",
  "PASSWORD_RESET_DELIVERY_FAILED",
];

export const ADMIN_CHANGE_EVENT_TYPES = [
  "USER_DEACTIVATED",
  "USER_ROLES_REPLACED",
  "ROLE_PERMISSIONS_REPLACED",
  "COMPANY_SUSPENDED",
  "COMPANY_REACTIVATED",
];

export const ACTIVITY_RESULT_LABELS: Record<string, string> = {
  SUCCESS: "Éxito",
  FAILURE: "Falla",
  BLOCKED: "Bloqueado",
};
