/**
 * Users Module — Public API
 * 
 * Provides user management for the admin panel including CRUD operations,
 * role assignment, and search functionality.
 * 
 * @example
 * ```tsx
 * // In a server component
 * import { listUsers, UserTable } from "@/modules/users";
 * 
 * const { users, total, page, totalPages } = await listUsers("john", undefined, 1);
 * return <UserTable users={users} />;
 * ```
 * 
 * @example
 * ```tsx
 * // In a server action
 * import { createUser } from "@/modules/users";
 * 
 * const result = await createUser(formData);
 * if (!result.ok) {
 *   console.error(result.error);
 * }
 * ```
 */

// Types
/** User with roles */
export type { UserWithRoles } from "./types";
/** Paginated users response */
export type { PaginatedUsers } from "./types";
/** Users filter options */
export type { UsersFilter } from "./types";
/** Role labels for display */
export { ROLE_LABELS } from "./types";
/** All available roles */
export { ALL_ROLES } from "./types";

// Queries
/** Get paginated users with filters */
export { getUsers } from "./queries";
/** Get a single user by ID */
export { getUserById } from "./queries";

// Actions
/** List users with search, department, and pagination */
export { listUsers } from "./actions";
/** Get a single user by ID (with auth check) */
export { getUser } from "./actions";
/** Create a new user */
export { createUser } from "./actions";
/** Form action wrapper for create */
export { createUserForm } from "./actions";
/** Update an existing user */
export { updateUser } from "./actions";
/** Form action wrapper for update */
export { updateUserForm } from "./actions";
/** Delete a user */
export { deleteUser } from "./actions";
/** Form action wrapper for delete */
export { deleteUserForm } from "./actions";
/** Get all available roles */
export { getAllRoles } from "./actions";
/** Action result type */
export type { ActionResult } from "./actions";

// Components
/** Users table component */
export { UserTable } from "./components/UserTable";
/** User search component */
export { UserSearch } from "./components/UserSearch";
/** Pagination component */
export { Pagination } from "./components/Pagination";
