import { type NextRequest } from "next/server";
import { getSessionContext } from "@/server/services/session";
import { listMovementsForProduct } from "@/server/repositories/inventory";
import { apiSuccess, apiError, handleApiError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionContext();
    if (!session || !session.businessId) {
      return apiError("You must be signed in.", 401);
    }

    const productId = request.nextUrl.searchParams.get("productId");
    if (!productId) {
      return apiError("productId is required.", 400);
    }

    const movements = await listMovementsForProduct(session.businessId, productId);
    return apiSuccess(movements);
  } catch (error) {
    return handleApiError(error);
  }
}
