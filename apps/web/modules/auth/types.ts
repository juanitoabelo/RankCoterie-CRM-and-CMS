/**
 * Auth Module — Types
 * 
 * Defines authentication and authorization types used across the admin panel.
 */
import { Role } from "@prisma/client";

/** Authenticated admin user with roles */
export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: Role[];
}

/** Session payload stored in cookie */
export interface SessionPayload {
  uid: string;
  exp: number;
}

/** Role-based section access mapping */
export type SectionRoles = Record<string, Role[]>;

/** Permission check function */
export type CanAccessSection = (sectionKey: string) => boolean;
