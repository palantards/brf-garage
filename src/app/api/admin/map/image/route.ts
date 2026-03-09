import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
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
    access: "public",
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
          <p>Kör detekteringsskriptet och importera resultatet:</p>
          <pre style="background:#f1f5f9;padding:12px;border-radius:6px;font-size:13px;">curl -o floorplan.png "${blob.url}"
python3 scripts/detect_spots.py floorplan.png --format json > spots.json
npx tsx scripts/import-spots.ts ${assocId} spots.json</pre>
        </div>
      `,
    }).catch(() => {}); // non-fatal — don't fail the upload if email fails
  }

  return NextResponse.json({ url: blob.url });
}
