import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { Pool } from "pg";
import { z } from "zod";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const uploadSchema = z.object({
  vendor_id: z.string().uuid("vendor_id must be a valid UUID"),
});

export async function POST(request: NextRequest) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Failed to parse form data" },
      { status: 400 },
    );
  }

  const vendorIdRaw = formData.get("vendor_id");
  const pdfFile = formData.get("pdf");

  if (!vendorIdRaw || typeof vendorIdRaw !== "string") {
    return NextResponse.json(
      { error: "vendor_id is required and must be a string" },
      { status: 400 },
    );
  }

  const parseResult = uploadSchema.safeParse({ vendor_id: vendorIdRaw });
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.errors[0].message },
      { status: 400 },
    );
  }

  const { vendor_id } = parseResult.data;

  if (!pdfFile) {
    return NextResponse.json(
      { error: "pdf file is required" },
      { status: 400 },
    );
  }

  if (!(pdfFile instanceof File)) {
    return NextResponse.json({ error: "pdf must be a file" }, { status: 400 });
  }

  if (pdfFile.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Uploaded file must be a PDF" },
      { status: 400 },
    );
  }

  let blob_url: string;

  try {
    const filename = `coi/${vendor_id}/${Date.now()}-${pdfFile.name}`;
    const blob = await put(filename, pdfFile, {
      access: "public",
      contentType: "application/pdf",
    });
    blob_url = blob.url;
  } catch (err) {
    console.error("Blob upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload PDF to storage" },
      { status: 500 },
    );
  }

  let coi_id: string;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO certificates_of_insurance (vendor_id, blob_url, review_status)
         VALUES ($1, $2, 'pending')
         RETURNING id`,
        [vendor_id, blob_url],
      );
      coi_id = result.rows[0].id;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Database insert error:", err);
    return NextResponse.json(
      { error: "Failed to save COI record to database" },
      { status: 500 },
    );
  }

  return NextResponse.json({ coi_id, blob_url }, { status: 201 });
}
