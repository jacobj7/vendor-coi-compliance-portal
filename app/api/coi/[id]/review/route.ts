import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const reviewSchema = z.object({
  action: z.enum(["approve", "flag"]),
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coiId = params.id;
  if (!coiId) {
    return NextResponse.json({ error: "COI ID is required" }, { status: 400 });
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
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 422 },
    );
  }

  const { action, reason } = parseResult.data;
  const reviewStatus = action === "approve" ? "approved" : "flagged";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Update the COI review status
    const updateCoiResult = await client.query(
      `UPDATE certificates_of_insurance
       SET review_status = $1,
           review_reason = $2,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, vendor_id, expiration_date, review_status`,
      [reviewStatus, reason ?? null, coiId],
    );

    if (updateCoiResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "COI not found" }, { status: 404 });
    }

    const updatedCoi = updateCoiResult.rows[0];
    const vendorId = updatedCoi.vendor_id;

    // Fetch all COIs for this vendor to recompute compliance
    const allCoisResult = await client.query(
      `SELECT id, review_status, expiration_date
       FROM certificates_of_insurance
       WHERE vendor_id = $1`,
      [vendorId],
    );

    const allCois = allCoisResult.rows;
    const now = new Date();

    let complianceStatus: "compliant" | "non_compliant" | "pending";

    if (allCois.length === 0) {
      complianceStatus = "pending";
    } else {
      const hasExpired = allCois.some(
        (coi) => coi.expiration_date && new Date(coi.expiration_date) < now,
      );
      const hasFlagged = allCois.some((coi) => coi.review_status === "flagged");
      const allApproved = allCois.every(
        (coi) => coi.review_status === "approved",
      );
      const hasPending = allCois.some(
        (coi) => coi.review_status === "pending" || coi.review_status === null,
      );

      if (hasFlagged || hasExpired) {
        complianceStatus = "non_compliant";
      } else if (allApproved && !hasExpired) {
        complianceStatus = "compliant";
      } else if (hasPending) {
        complianceStatus = "pending";
      } else {
        complianceStatus = "pending";
      }
    }

    // Update vendor compliance status
    await client.query(
      `UPDATE vendors
       SET compliance_status = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [complianceStatus, vendorId],
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        coi: {
          id: updatedCoi.id,
          review_status: updatedCoi.review_status,
        },
        vendor: {
          id: vendorId,
          compliance_status: complianceStatus,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error reviewing COI:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
