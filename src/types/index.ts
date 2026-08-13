/**
 * Core domain types shared across the application.
 * These mirror the database schema conceptually (see docs/ARCHITECTURE.md
 * and the Phase 3 migrations) but are hand-authored for use before the
 * generated Database types exist, and for shaping API responses.
 */

export type AppRole = "super_admin" | "business_owner" | "manager" | "cashier";

export interface BusinessMember {
  id: string;
  businessId: string;
  userId: string;
  role: AppRole;
  branchId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  currency: string; // ISO 4217, defaults to "KES"
  timezone: string;
  isActive: boolean;
  subscriptionStatus: "trialing" | "active" | "past_due" | "canceled";
  createdAt: string;
}

export interface Branch {
  id: string;
  businessId: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

/** The resolved "who am I, in what business/branch, with what role" context. */
export interface SessionContext {
  userId: string;
  email: string;
  businessId: string | null;
  branchId: string | null;
  role: AppRole | null;
}

export type PaymentMethod =
  | "cash"
  | "mpesa"
  | "card"
  | "bank"
  | "credit"
  | "other";

export type PaymentStatus = "pending" | "success" | "failed" | "reversed";

export type SyncStatus = "online" | "offline" | "syncing" | "sync_error";
