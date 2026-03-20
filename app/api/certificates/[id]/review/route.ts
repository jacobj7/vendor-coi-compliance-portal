import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certificateId = params.id;

  if (!certificateId) {
    return NextResponse.json(
      { error: "Certificate ID is required" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = reviewSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.errors },
      { status: 400 },
    );
  }

  const { action, notes } = parseResult.data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const certResult = await client.query(
      "SELECT * FROM certificates WHERE id = $1",
      [certificateId],
    );

    if (certResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 },
      );
    }

    const certificate = certResult.rows[0];
    const vendorId = certificate.vendor_id;

    const newCertStatus = action === "approve" ? "approved" : "rejected";
    const newComplianceStatus =
      action === "approve" ? "compliant" : "non_compliant";

    const updatedCert = await client.query(
      `UPDATE certificates
       SET status = $1, review_notes = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        newCertStatus,
        notes ?? null,
        session.user.email ?? session.user.name ?? "unknown",
        certificateId,
      ],
    );

    if (vendorId) {
      await client.query(
        `UPDATE vendors
         SET compliance_status = $1, updated_at = NOW()
         WHERE id = $2`,
        [newComplianceStatus, vendorId],
      );
    }

    await client.query(
      `INSERT INTO audit_logs (
         entity_type,
         entity_id,
         action,
         performed_by,
         notes,
         metadata,
         created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        "certificate",
        certificateId,
        action,
        session.user.email ?? session.user.name ?? "unknown",
        notes ?? null,
        JSON.stringify({
          previous_status: certificate.status,
          new_status: newCertStatus,
          vendor_id: vendorId,
          vendor_compliance_status: newComplianceStatus,
        }),
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        message: `Certificate ${action === "approve" ? "approved" : "rejected"} successfully`,
        certificate: updatedCert.rows[0],
      },
      { status: 200 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error reviewing certificate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
