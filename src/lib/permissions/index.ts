import type { AppRole } from "@/types";

/**
 * Central RBAC permission matrix.
 *
 * This is the single source of truth for "what can each role do" on the
 * client (for hiding/disabling UI). It is NOT a security boundary by
 * itself — every server action / API route must re-check permissions
 * server-side (see src/server/services) and RLS policies must enforce
 * tenant + row-level access independently. Treat this file as UX,
 * and the server checks as the real gate.
 */
export const PERMISSIONS = {
  // Platform
  MANAGE_BUSINESSES: "manage_businesses",
  MANAGE_SUBSCRIPTIONS: "manage_subscriptions",
  VIEW_PLATFORM_ANALYTICS: "view_platform_analytics",
  SUSPEND_BUSINESSES: "suspend_businesses",
  MANAGE_SYSTEM_CONFIG: "manage_system_config",
  VIEW_SYSTEM_AUDIT_LOGS: "view_system_audit_logs",

  // Business
  MANAGE_BUSINESS: "manage_business",
  MANAGE_BRANCHES: "manage_branches",
  MANAGE_SETTINGS: "manage_settings",
  CONFIGURE_PAYMENTS: "configure_payments",

  // Products / Inventory
  MANAGE_PRODUCTS: "manage_products",
  DELETE_PRODUCTS: "delete_products",
  MANAGE_INVENTORY: "manage_inventory",

  // People
  MANAGE_EMPLOYEES: "manage_employees",
  MANAGE_CUSTOMERS: "manage_customers",
  MANAGE_SUPPLIERS: "manage_suppliers",

  // Sales / POS
  PROCESS_SALES: "process_sales",
  DELETE_SALES: "delete_sales",
  APPROVE_DISCOUNTS: "approve_discounts",
  VIEW_SALES: "view_sales",

  // Reporting
  VIEW_REPORTS: "view_reports",
  VIEW_SENSITIVE_FINANCIAL_REPORTS: "view_sensitive_financial_reports",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  super_admin: [
    PERMISSIONS.MANAGE_BUSINESSES,
    PERMISSIONS.MANAGE_SUBSCRIPTIONS,
    PERMISSIONS.VIEW_PLATFORM_ANALYTICS,
    PERMISSIONS.SUSPEND_BUSINESSES,
    PERMISSIONS.MANAGE_SYSTEM_CONFIG,
    PERMISSIONS.VIEW_SYSTEM_AUDIT_LOGS,
  ],
  business_owner: [
    PERMISSIONS.MANAGE_BUSINESS,
    PERMISSIONS.MANAGE_BRANCHES,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.DELETE_PRODUCTS,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.MANAGE_EMPLOYEES,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.MANAGE_SUPPLIERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_SENSITIVE_FINANCIAL_REPORTS,
    PERMISSIONS.CONFIGURE_PAYMENTS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.PROCESS_SALES,
    PERMISSIONS.DELETE_SALES,
    PERMISSIONS.APPROVE_DISCOUNTS,
    PERMISSIONS.VIEW_SALES,
  ],
  manager: [
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.MANAGE_EMPLOYEES,
    PERMISSIONS.APPROVE_DISCOUNTS,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.PROCESS_SALES,
  ],
  cashier: [
    PERMISSIONS.PROCESS_SALES,
    PERMISSIONS.VIEW_SALES, // scoped to their own sales at the query/RLS level
  ],
};

/** Check if a role has a given permission. Pure function, safe for client + server. */
export function hasPermission(role: AppRole | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Check multiple permissions at once (all must be true). */
export function hasAllPermissions(role: AppRole | null, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/** Check multiple permissions at once (at least one must be true). */
export function hasAnyPermission(role: AppRole | null, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function getPermissionsForRole(role: AppRole | null): Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] ?? [];
}
