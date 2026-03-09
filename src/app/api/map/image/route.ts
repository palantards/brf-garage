import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/db/client";

// GET /api/map/image — proxy the private Vercel Blob floor plan for the session's association
export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const [assoc] = await sql<{ map_image_url: string | null }[]>`
    SELECT map_image_url FROM associations WHERE id = ${session.user.associationId}
  `;

  if (!assoc?.map_image_url) return new NextResponse("Not found", { status: 404 });

  const res = await fetch(assoc.map_image_url, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });

  if (!res.ok) return new NextResponse("Blob not found", { status: 404 });

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
