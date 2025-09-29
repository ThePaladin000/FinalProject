import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST() {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Get a server-issued Clerk token for Convex if available
    const token = await getToken({ template: "convex" }).catch(() => null);
    if (token) {
      convex.setAuth(token.startsWith("Bearer ") ? token.slice(7) : token);
    }

    // Use server-side mutation that does not depend on Convex auth context
    // Fetch additional user details from Clerk if needed in the future; for now we send userId
    const result = await convex.mutation(api.mutations.ensureUserServer, {
      userId,
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Ensure user API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    type MaybeHttpError = {
      response?: {
        status?: number;
        data?: unknown;
      };
      data?: unknown;
    };
    const errorLike = error as MaybeHttpError;
    const status =
      typeof errorLike.response?.status === "number"
        ? errorLike.response.status
        : 500;
    const responseData = errorLike.response?.data ?? errorLike.data;
    return NextResponse.json(
      {
        error: "Failed to ensure user",
        message,
        convex: responseData,
      },
      { status }
    );
  }
}

export async function GET() {
  return POST();
}


