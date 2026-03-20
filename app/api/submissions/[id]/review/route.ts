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
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 },
      );
    }

    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: "Unable to identify user from session." },
        { status: 401 },
      );
    }

    const client = await pool.connect();

    try {
      const coordinatorResult = await client.query(
        `SELECT id, role FROM users WHERE email = $1`,
        [userEmail],
      );

      if (coordinatorResult.rows.length === 0) {
        return NextResponse.json({ error: "User not found." }, { status: 403 });
      }

      const coordinator = coordinatorResult.rows[0];

      if (coordinator.role !== "coordinator" && coordinator.role !== "admin") {
        return NextResponse.json(
          { error: "Forbidden. Coordinator access required." },
          { status: 403 },
        );
      }

      const body = await request.json();
      const parseResult = reviewSchema.safeParse(body);

      if (!parseResult.success) {
        return NextResponse.json(
          {
            error: "Invalid request body.",
            details: parseResult.error.flatten(),
          },
          { status: 400 },
        );
      }

      const { action, notes } = parseResult.data;
      const coiId = params.id;

      const coiCheck = await client.query(
        `SELECT id, vendor_id, status FROM certificates_of_insurance WHERE id = $1`,
        [coiId],
      );

      if (coiCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Certificate of Insurance not found." },
          { status: 404 },
        );
      }

      const coi = coiCheck.rows[0];
      const newStatus = action === "approve" ? "approved" : "rejected";

      await client.query("BEGIN");

      const updateCoiResult = await client.query(
        `UPDATE certificates_of_insurance
         SET status = $1,
             reviewed_at = NOW(),
             reviewed_by = $2,
             notes = $3,
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [newStatus, coordinator.id, notes ?? null, coiId],
      );

      const updatedCoi = updateCoiResult.rows[0];

      if (action === "approve") {
        await client.query(
          `UPDATE vendors
           SET compliance_status = 'compliant',
               updated_at = NOW()
           WHERE id = $1`,
          [coi.vendor_id],
        );
      } else {
        await client.query(
          `UPDATE vendors
           SET compliance_status = 'non_compliant',
               updated_at = NOW()
           WHERE id = $1`,
          [coi.vendor_id],
        );
      }

      await client.query(
        `INSERT INTO audit_log (
           entity_type,
           entity_id,
           action,
           performed_by,
           details,
           created_at
         ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          "certificates_of_insurance",
          coiId,
          `coi_${action}d`,
          coordinator.id,
          JSON.stringify({
            previous_status: coi.status,
            new_status: newStatus,
            notes: notes ?? null,
            vendor_id: coi.vendor_id,
          }),
        ],
      );

      await client.query("COMMIT");

      return NextResponse.json(
        {
          message: `Certificate of Insurance ${action}d successfully.`,
          coi: updatedCoi,
        },
        { status: 200 },
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error reviewing COI submission:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
