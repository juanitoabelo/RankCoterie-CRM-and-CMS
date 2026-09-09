/**
 * Canopy V2 — admin authentication & authorization.
 * 
 * @deprecated Import from "@/modules/auth" instead.
 * This file is maintained for backward compatibility.
 */
export {
  // Types
  type AdminUser,
  type CanAccessSection,
  type SessionPayload,
  
  // Session
  createSession,
  destroySession,
  getSessionUid,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  
  // Permissions
  isSuperAdmin,
  canAccessSection,
  
  // User lookup
  getCurrentUser,
  requireUser,
  requireSection,
  getApiUser,
} from "@/modules/auth";
