import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const coverageSchema = z.object({
  general_liability_limit: z.string().optional(),
  workers_comp_limit: z.string().optional(),
  expiration_date: z.string().optional(),
  insurer_name: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Look up the submission request by token
    const submissionResult = await client.query(
      `SELECT * FROM submission_requests WHERE token = $1 AND used = false`,
      [token],
    );

    if (submissionResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Invalid or already used submission token" },
        { status: 404 },
      );
    }

    const submissionRequest = submissionResult.rows[0];

    // Check if token is expired
    if (
      submissionRequest.expires_at &&
      new Date(submissionRequest.expires_at) < new Date()
    ) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Submission token has expired" },
        { status: 410 },
      );
    }

    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Failed to parse form data" },
        { status: 400 },
      );
    }

    const file = formData.get("file") as File | null;

    if (!file) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: "Invalid file type. Allowed types: PDF, JPEG, PNG, GIF, WEBP",
        },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 },
      );
    }

    // Extract coverage fields
    const rawCoverageData = {
      general_liability_limit: formData.get("general_liability_limit") as
        | string
        | null,
      workers_comp_limit: formData.get("workers_comp_limit") as string | null,
      expiration_date: formData.get("expiration_date") as string | null,
      insurer_name: formData.get("insurer_name") as string | null,
    };

    // Filter out null values
    const filteredCoverageData: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawCoverageData)) {
      if (value !== null && value !== undefined) {
        filteredCoverageData[key] = value;
      }
    }

    const coverageValidation = coverageSchema.safeParse(filteredCoverageData);

    if (!coverageValidation.success) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: "Invalid coverage data",
          details: coverageValidation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const coverageData = coverageValidation.data;

    // Read file as buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const fileType = file.type;
    const fileSize = file.size;

    // Parse expiration date if provided
    let expirationDate: Date | null = null;
    if (coverageData.expiration_date) {
      const parsed = new Date(coverageData.expiration_date);
      if (!isNaN(parsed.getTime())) {
        expirationDate = parsed;
      }
    }

    // Parse numeric limits
    let generalLiabilityLimit: number | null = null;
    if (coverageData.general_liability_limit) {
      const parsed = parseFloat(
        coverageData.general_liability_limit.replace(/[^0-9.]/g, ""),
      );
      if (!isNaN(parsed)) {
        generalLiabilityLimit = parsed;
      }
    }

    let workersCompLimit: number | null = null;
    if (coverageData.workers_comp_limit) {
      const parsed = parseFloat(
        coverageData.workers_comp_limit.replace(/[^0-9.]/g, ""),
      );
      if (!isNaN(parsed)) {
        workersCompLimit = parsed;
      }
    }

    // Create certificate record
    const certificateResult = await client.query(
      `INSERT INTO certificates (
        submission_request_id,
        vendor_id,
        file_name,
        file_type,
        file_size,
        file_data,
        status,
        general_liability_limit,
        workers_comp_limit,
        expiration_date,
        insurer_name,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING id, status, created_at`,
      [
        submissionRequest.id,
        submissionRequest.vendor_id || null,
        fileName,
        fileType,
        fileSize,
        fileBuffer,
        "pending_review",
        generalLiabilityLimit,
        workersCompLimit,
        expirationDate,
        coverageData.insurer_name || null,
      ],
    );

    const certificate = certificateResult.rows[0];

    // Mark submission request as used
    await client.query(
      `UPDATE submission_requests SET used = true, used_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [submissionRequest.id],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        certificate: {
          id: certificate.id,
          status: certificate.status,
          created_at: certificate.created_at,
        },
        message: "Certificate uploaded successfully and is pending review",
      },
      { status: 201 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error processing certificate upload:", error);

    if (error instanceof Error) {
      // Handle specific database errors
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
    client.release();
  }
}
