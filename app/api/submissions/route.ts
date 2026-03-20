import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { z } from "zod";
import { Pool } from "pg";
import { extractCOIFields } from "@/lib/coi-extractor";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const SubmissionSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export async function POST(request: NextRequest) {
  let client;
  try {
    const formData = await request.formData();

    const token = formData.get("token");
    const file = formData.get("file");

    const validationResult = SubmissionSchema.safeParse({ token });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "PDF file is required" },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 },
      );
    }

    client = await pool.connect();

    const vendorResult = await client.query(
      "SELECT id, name, email FROM vendors WHERE token = $1 AND is_active = true",
      [token],
    );

    if (vendorResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or inactive token" },
        { status: 401 },
      );
    }

    const vendor = vendorResult.rows[0];

    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blobPath = `submissions/${vendor.id}/${timestamp}_${sanitizedFileName}`;

    const blob = await put(blobPath, fileBytes, {
      access: "public",
      contentType: "application/pdf",
    });

    const extractedData = await extractCOIFields(fileBuffer);

    const submissionResult = await client.query(
      `INSERT INTO submissions (
        vendor_id,
        pdf_url,
        blob_pathname,
        status,
        extracted_data,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, vendor_id, pdf_url, status, extracted_data, created_at`,
      [
        vendor.id,
        blob.url,
        blob.pathname,
        "pending_review",
        JSON.stringify(extractedData),
      ],
    );

    const submission = submissionResult.rows[0];

    return NextResponse.json(
      {
        success: true,
        submission: {
          id: submission.id,
          vendorId: submission.vendor_id,
          pdfUrl: submission.pdf_url,
          status: submission.status,
          extractedData: submission.extracted_data,
          createdAt: submission.created_at,
        },
        vendor: {
          id: vendor.id,
          name: vendor.name,
          email: vendor.email,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Submission error:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("relation") &&
        error.message.includes("does not exist")
      ) {
        return NextResponse.json(
          { error: "Database configuration error" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
