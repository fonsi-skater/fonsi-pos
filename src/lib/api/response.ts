import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Consistent API response envelope (per spec §29: human-readable, secure,
 * actionable errors — never leaking database errors or secrets).
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: { message, details } },
    { status }
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return apiError("Invalid input.", 422, error.flatten());
  }

  // Never leak raw database/internal error messages to the client.
  console.error("[api_error]", error);
  return apiError(
    "Something went wrong while processing your request. Please try again.",
    500
  );
}
