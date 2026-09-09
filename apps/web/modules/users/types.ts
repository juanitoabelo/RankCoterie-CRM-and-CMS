/**
 * Users Module — Types
 * 
 * Defines types for user management.
 * Types match the actual Prisma schema fields.
 */
import { Role } from "@prisma/client";

/** User with roles */
export interface UserWithRoles {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  department: string | null;
  authorUrl: string | null;
  includeInStaffPages: boolean;
  active: boolean;
  createdAt: Date;
  roles: Array<{ role: Role }>;
  socialMedia: unknown;
  quickBiography: string | null;
  generalSkillsInfo: string | null;
  jobTitle: string | null;
  phone: string | null;
}

/** Paginated users response */
export interface PaginatedUsers {
  users: UserWithRoles[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Users query filters */
export interface UsersFilter {
  search?: string;
  department?: string;
  page?: number;
  pageSize?: number;
}

/** Role labels for display */
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  EDITOR: "Editor",
  MARKETING: "Marketing",
  REVIEWER: "Reviewer",
  SALES_REP: "Sales Rep",
  GRACE_COACH: "Grace Coach",
};

/** All available roles */
export const ALL_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.EDITOR,
  Role.MARKETING,
  Role.REVIEWER,
  Role.SALES_REP,
  Role.GRACE_COACH,
];
