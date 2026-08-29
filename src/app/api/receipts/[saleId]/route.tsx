import { renderToBuffer } from "@react-pdf/renderer";
import { getSessionContext } from "@/server/services/session";
import { resolveEmbedToken } from "@/server/services/embed-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getReceiptData, getReceiptDataForEmbed } from "@/server/repositories/receipts";
import { ReceiptDocument } from "@/lib/receipts/receipt-document";

// react-pdf renders with Node APIs under the hood — not compatible with
// the Edge runtime.
export const runtime = "nodejs";

/**
 * Serves a sale's receipt as a PDF, generated on demand (not pre-rendered
 * or stored — receipts.pdf_url stays unused for now; regenerating is
 * cheap and always reflects the sale's actual recorded data, so there's
 * nothing to keep in sync). Reachable two ways, matching every other
 * dual-path checkout concern in this codebase:
 *   - Dashboard: /api/receipts/<saleId>, authenticated session + VIEW_SALES
 *   - Embed POS: /api/receipts/<saleId>?token=<embedToken>, no session
 */
export async function GET(request: Request, { params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = await params;
  const embedToken = new URL(request.url).searchParams.get("token");

  const data = embedToken ? await loadForEmbed(saleId, embedToken) : await loadForSession(saleId);

  if (!data) {
    return new Response("Receipt not found", { status: 404 });
  }

  const buffer = await renderToBuffer(<ReceiptDocument data={data} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receipt-${data.saleNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

async function loadForEmbed(saleId: string, embedToken: string) {
  const auth = await resolveEmbedToken(embedToken);
  if (!auth) return null;
  return getReceiptDataForEmbed(saleId, auth.businessId);
}

async function loadForSession(saleId: string) {
  const session = await getSessionContext();
  if (!session?.businessId || !hasPermission(session.role, PERMISSIONS.VIEW_SALES)) {
    return null;
  }
  return getReceiptData(saleId, session.businessId);
}
