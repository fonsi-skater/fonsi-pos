import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Boxes,
  Receipt,
  Users,
  Truck,
  ShoppingBag,
  Wallet,
  UserCog,
  Building2,
  CreditCard,
  BarChart3,
  Bell,
  Settings,
  ScrollText,
  Puzzle,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** If set, the item is hidden unless the current role has this permission. */
  requiredPermission?: Permission;
}

export const DASHBOARD_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "POS", href: "/pos", icon: ShoppingCart, requiredPermission: PERMISSIONS.PROCESS_SALES },
  { label: "Products", href: "/products", icon: Package },
  { label: "Categories", href: "/categories", icon: Tags },
  { label: "Inventory", href: "/inventory", icon: Boxes, requiredPermission: PERMISSIONS.MANAGE_INVENTORY },
  { label: "Sales", href: "/sales", icon: Receipt, requiredPermission: PERMISSIONS.VIEW_SALES },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Suppliers", href: "/suppliers", icon: Truck, requiredPermission: PERMISSIONS.MANAGE_SUPPLIERS },
  { label: "Purchases", href: "/purchases", icon: ShoppingBag, requiredPermission: PERMISSIONS.MANAGE_SUPPLIERS },
  { label: "Expenses", href: "/expenses", icon: Wallet, requiredPermission: PERMISSIONS.VIEW_SENSITIVE_FINANCIAL_REPORTS },
  { label: "Employees", href: "/employees", icon: UserCog, requiredPermission: PERMISSIONS.MANAGE_EMPLOYEES },
  { label: "Branches", href: "/branches", icon: Building2, requiredPermission: PERMISSIONS.MANAGE_BRANCHES },
  { label: "Payments", href: "/payments", icon: CreditCard, requiredPermission: PERMISSIONS.CONFIGURE_PAYMENTS },
  { label: "Reports", href: "/reports", icon: BarChart3, requiredPermission: PERMISSIONS.VIEW_REPORTS },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Audit Logs", href: "/audit-logs", icon: ScrollText, requiredPermission: PERMISSIONS.VIEW_SYSTEM_AUDIT_LOGS },
  { label: "Plugins", href: "/plugins", icon: Puzzle, requiredPermission: PERMISSIONS.MANAGE_SETTINGS },
  { label: "Settings", href: "/settings", icon: Settings, requiredPermission: PERMISSIONS.MANAGE_SETTINGS },
];
