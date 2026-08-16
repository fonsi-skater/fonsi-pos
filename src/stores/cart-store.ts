import { create } from "zustand";

export interface CartItem {
  productId: string;
  productVariantId: string | null;
  name: string;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  /** Ratio 0–1, mirrors products.discount — matches server-side calc exactly. */
  discountRate: number;
  /** Ratio 0–1, mirrors products.tax_rate. */
  taxRate: number;
  /** Stock on hand at add-to-cart time, for a soft over-sell warning only — never authoritative. */
  availableStock: number;
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
  paymentMethod: "cash" | "mpesa" | "card" | "bank" | "credit" | "other";
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string, productVariantId: string | null) => void;
  updateQuantity: (productId: string, productVariantId: string | null, quantity: number) => void;
  setCustomer: (customerId: string | null) => void;
  setPaymentMethod: (method: CartState["paymentMethod"]) => void;
  clear: () => void;
  /** Client-side estimate only — the server recalculates authoritatively at checkout. */
  getEstimatedTotal: () => number;
  getItemCount: () => number;
}

function lineKey(productId: string, productVariantId: string | null) {
  return `${productId}:${productVariantId ?? "base"}`;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  paymentMethod: "cash",

  addItem: (item) =>
    set((state) => {
      const key = lineKey(item.productId, item.productVariantId);
      const existing = state.items.find((i) => lineKey(i.productId, i.productVariantId) === key);
      const addQty = item.quantity ?? 1;
      if (existing) {
        return {
          items: state.items.map((i) =>
            lineKey(i.productId, i.productVariantId) === key ? { ...i, quantity: i.quantity + addQty } : i
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: addQty }] };
    }),

  removeItem: (productId, productVariantId) =>
    set((state) => ({
      items: state.items.filter((i) => lineKey(i.productId, i.productVariantId) !== lineKey(productId, productVariantId)),
    })),

  updateQuantity: (productId, productVariantId, quantity) =>
    set((state) => ({
      items: state.items
        .map((i) => (lineKey(i.productId, i.productVariantId) === lineKey(productId, productVariantId) ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0),
    })),

  setCustomer: (customerId) => set({ customerId }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),

  clear: () => set({ items: [], customerId: null, paymentMethod: "cash" }),

  getEstimatedTotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      const lineDiscount = item.unitPrice * item.quantity * item.discountRate;
      const lineSubtotal = item.unitPrice * item.quantity - lineDiscount;
      const lineTax = lineSubtotal * item.taxRate;
      return sum + lineSubtotal + lineTax;
    }, 0);
  },

  getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
