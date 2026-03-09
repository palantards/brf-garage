import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  if (!["png", "jpg", "jpeg", "webp"].includes(ext)) {
    return NextResponse.json({ error: "Only PNG/JPG/WebP allowed" }, { status: 400 });
  }

  const assocId = session.user.associationId;

  const blob = await put(`garage-maps/${assocId}/floorplan.${ext}`, file, {
    access: "private",
    allowOverwrite: true,
  });

  // Save URL and mark as pending processing
  await sql`
    UPDATE associations
    SET map_image_url = ${blob.url}, map_status = 'pending'
    WHERE id = ${assocId}
  `;

  // Notify ops so we know to run detect_spots.py
  const notifyEmail = process.env.OPS_EMAIL;
  if (notifyEmail && process.env.RESEND_API_KEY) {
    const [assoc] = await sql<{ name: string }[]>`
      SELECT name FROM associations WHERE id = ${assocId}
    `;
    await resend.emails.send({
      from: process.env.RESEND_FROM!,
      to: notifyEmail,
      subject: `[BRF Garage] Ny garageplan väntar på bearbetning — ${assoc?.name ?? assocId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
          <h2>Ny garageplan uppladdad</h2>
          <p><strong>Förening:</strong> ${assoc?.name ?? assocId}</p>
          <p><strong>Bild:</strong> <a href="${blob.url}">${blob.url}</a></p>
          <p>Kör pipeline-skriptet (en rad):</p>
          <pre style="background:#f1f5f9;padding:12px;border-radius:6px;font-size:13px;">npx tsx scripts/process-map.ts ${assocId}</pre>
        </div>
      `,
    }).catch(() => {}); // non-fatal — don't fail the upload if email fails
  }

  return NextResponse.json({ url: blob.url });
}

// DELETE /api/admin/map/image — remove uploaded floor plan and reset to unconfigured
export async function DELETE() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assocId = session.user.associationId;

  const [assoc] = await sql<{ map_image_url: string | null }[]>`
    SELECT map_image_url FROM associations WHERE id = ${assocId}
  `;

  if (assoc?.map_image_url) {
    await del(assoc.map_image_url).catch(() => {}); // non-fatal if already gone
  }

  await sql`
    UPDATE associations
    SET map_image_url = NULL, map_status = 'unconfigured'
    WHERE id = ${assocId}
  `;

  return NextResponse.json({ ok: true });
}
