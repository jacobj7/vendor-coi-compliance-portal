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
  try {
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;

    const client = await pool.connect();
    try {
      const adminCheck = await client.query(
        "SELECT id, role FROM users WHERE email = $1",
        [userEmail],
      );

      if (adminCheck.rows.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const adminUser = adminCheck.rows[0];

      if (adminUser.role !== "admin") {
        return NextResponse.json(
          { error: "Forbidden: Admin access required" },
          { status: 403 },
        );
      }

      const submissionId = params.id;

      if (!submissionId || isNaN(Number(submissionId))) {
        return NextResponse.json(
          { error: "Invalid submission ID" },
          { status: 400 },
        );
      }

      const body = await request.json();
      const validationResult = reviewSchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: "Invalid request body",
            details: validationResult.error.errors,
          },
          { status: 400 },
        );
      }

      const { action, notes } = validationResult.data;

      const submissionCheck = await client.query(
        "SELECT id, vendor_id, status FROM submissions WHERE id = $1",
        [submissionId],
      );

      if (submissionCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Submission not found" },
          { status: 404 },
        );
      }

      const submission = submissionCheck.rows[0];

      if (submission.status !== "pending") {
        return NextResponse.json(
          { error: "Submission has already been reviewed" },
          { status: 409 },
        );
      }

      const newStatus = action === "approve" ? "approved" : "rejected";
      const complianceStatus =
        action === "approve" ? "compliant" : "non_compliant";

      await client.query("BEGIN");

      try {
        const updatedSubmission = await client.query(
          `UPDATE submissions
           SET status = $1, reviewed_by = $2, reviewed_at = NOW(), notes = $3, updated_at = NOW()
           WHERE id = $4
           RETURNING *`,
          [newStatus, adminUser.id, notes || null, submissionId],
        );

        await client.query(
          `UPDATE vendors
           SET compliance_status = $1, updated_at = NOW()
           WHERE id = $2`,
          [complianceStatus, submission.vendor_id],
        );

        await client.query(
          `INSERT INTO audit_logs (
            action,
            entity_type,
            entity_id,
            performed_by,
            details,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            `submission_${action}d`,
            "submission",
            submissionId,
            adminUser.id,
            JSON.stringify({
              submission_id: submissionId,
              vendor_id: submission.vendor_id,
              action,
              new_status: newStatus,
              compliance_status: complianceStatus,
              notes: notes || null,
              reviewed_by: adminUser.id,
            }),
          ],
        );

        await client.query("COMMIT");

        return NextResponse.json(
          {
            message: `Submission ${action}d successfully`,
            submission: updatedSubmission.rows[0],
          },
          { status: 200 },
        );
      } catch (transactionError) {
        await client.query("ROLLBACK");
        throw transactionError;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error reviewing submission:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
