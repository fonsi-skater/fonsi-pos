import { create } from "zustand";

export interface CartItem {
  productId: string;
  productVariantId: string | null;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  discount: number; // amount off this line, in currency units
  taxRate: number; // e.g. 0.16 for 16%
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (productVariantId: string | null, productId: string) => void;
  updateQuantity: (
    productVariantId: string | null,
    productId: string,
    quantity: number
  ) => void;
  setCustomer: (customerId: string | null) => void;
  clear: () => void;
  /** Client-side estimate only — the server recalculates authoritatively at checkout. */
  getEstimatedTotal: () => number;
}

function lineKey(productId: string, productVariantId: string | null) {
  return `${productId}:${productVariantId ?? "base"}`;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,

  addItem: (item) =>
    set((state) => {
      const key = lineKey(item.productId, item.productVariantId);
      const existing = state.items.find(
        (i) => lineKey(i.productId, i.productVariantId) === key
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            lineKey(i.productId, i.productVariantId) === key
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        };
      }
      return { items: [...state.items, item] };
    }),

  removeItem: (productVariantId, productId) =>
    set((state) => ({
      items: state.items.filter(
        (i) => lineKey(i.productId, i.productVariantId) !== lineKey(productId, productVariantId)
      ),
    })),

  updateQuantity: (productVariantId, productId, quantity) =>
    set((state) => ({
      items: state.items
        .map((i) =>
          lineKey(i.productId, i.productVariantId) === lineKey(productId, productVariantId)
            ? { ...i, quantity }
            : i
        )
        .filter((i) => i.quantity > 0),
    })),

  setCustomer: (customerId) => set({ customerId }),

  clear: () => set({ items: [], customerId: null }),

  getEstimatedTotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      const lineSubtotal = item.unitPrice * item.quantity - item.discount;
      const lineTax = lineSubtotal * item.taxRate;
      return sum + lineSubtotal + lineTax;
    }, 0);
  },
}));
