import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ReceiptData } from "@/server/repositories/receipts";

// A plain hex approximation of the app's brand violet (--primary, defined
// as oklch(0.62 0.23 296) in globals.css) — react-pdf's own style engine
// doesn't understand oklch(), so this is a manually-picked equivalent
// rather than something shared with the web CSS.
const BRAND_VIOLET = "#7C3AED";
const INK = "#1F1533";
const MUTED = "#6B6478";
const BORDER = "#E4E0EC";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    color: INK,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 16,
  },
  businessName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: BRAND_VIOLET,
  },
  muted: {
    color: MUTED,
    fontSize: 9,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  metaLabel: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 10,
    marginTop: 2,
  },
  table: {
    marginTop: 20,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F5F3F9",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  colItem: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.4, textAlign: "right" },
  colSubtotal: { flex: 1.4, textAlign: "right" },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    textTransform: "uppercase",
  },
  sku: {
    fontSize: 8,
    color: MUTED,
    marginTop: 1,
  },
  totals: {
    marginTop: 12,
    alignSelf: "flex-end",
    width: 220,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: BRAND_VIOLET,
  },
  footer: {
    marginTop: 32,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    textAlign: "center",
  },
  footerThanks: {
    fontSize: 10,
    marginBottom: 2,
  },
  footerBrand: {
    fontSize: 8,
    color: MUTED,
  },
});

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  mpesa: "M-Pesa",
  card: "Card",
  bank: "Bank transfer",
  credit: "Credit",
  other: "Other",
};

export function ReceiptDocument({ data }: { data: ReceiptData }) {
  return (
    <Document title={`Receipt ${data.receiptNumber}`}>
      <Page size="A5" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.businessName}>{data.businessName}</Text>
          <Text style={styles.muted}>{data.branchName}</Text>
          {data.branchAddress && <Text style={styles.muted}>{data.branchAddress}</Text>}
          {data.branchPhone && <Text style={styles.muted}>{data.branchPhone}</Text>}
        </View>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>Receipt</Text>
            <Text style={styles.metaValue}>{data.receiptNumber}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Sale</Text>
            <Text style={styles.metaValue}>{data.saleNumber}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{formatDate(data.createdAt, true)}</Text>
          </View>
          {data.customerName && (
            <View>
              <Text style={styles.metaLabel}>Customer</Text>
              <Text style={styles.metaValue}>{data.customerName}</Text>
            </View>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, styles.colItem]}>Item</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>Price</Text>
            <Text style={[styles.tableHeaderText, styles.colSubtotal]}>Subtotal</Text>
          </View>
          {data.items.map((item, i) => (
            <View style={styles.tableRow} key={i}>
              <View style={styles.colItem}>
                <Text>{item.productName}</Text>
                {item.sku && <Text style={styles.sku}>{item.sku}</Text>}
              </View>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unitPrice, data.currency)}</Text>
              <Text style={styles.colSubtotal}>{formatCurrency(item.subtotal, data.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{formatCurrency(data.subtotal, data.currency)}</Text>
          </View>
          {data.discountAmount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.muted}>Discount</Text>
              <Text>-{formatCurrency(data.discountAmount, data.currency)}</Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text style={styles.muted}>Tax</Text>
            <Text>{formatCurrency(data.taxAmount, data.currency)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(data.totalAmount, data.currency)}</Text>
          </View>
          <View style={[styles.totalsRow, { marginTop: 8 }]}>
            <Text style={styles.muted}>Paid via</Text>
            <Text>
              {PAYMENT_METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod}
              {data.paymentStatus === "pending" ? " (pending confirmation)" : ""}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerThanks}>Thank you for your business!</Text>
          <Text style={styles.footerBrand}>Powered by Fonsi POS</Text>
        </View>
      </Page>
    </Document>
  );
}
