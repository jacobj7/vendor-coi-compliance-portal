import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid vendor ID", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id } = parsed.data;

    const client = await pool.connect();
    try {
      const vendorResult = await client.query(
        `
        SELECT
          v.id,
          v.name,
          v.description,
          v.contact_email,
          v.contact_phone,
          v.website,
          v.address,
          v.status,
          v.created_at,
          v.updated_at,
          c.id AS category_id,
          c.name AS category_name,
          c.description AS category_description,
          s.id AS latest_submission_id,
          s.status AS latest_submission_status,
          s.submitted_at AS latest_submission_submitted_at,
          s.reviewed_at AS latest_submission_reviewed_at,
          s.notes AS latest_submission_notes
        FROM vendors v
        LEFT JOIN categories c ON v.category_id = c.id
        LEFT JOIN LATERAL (
          SELECT
            id,
            status,
            submitted_at,
            reviewed_at,
            notes
          FROM submissions
          WHERE vendor_id = v.id
          ORDER BY submitted_at DESC
          LIMIT 1
        ) s ON true
        WHERE v.id = $1
        `,
        [id],
      );

      if (vendorResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Vendor not found" },
          { status: 404 },
        );
      }

      const row = vendorResult.rows[0];

      const vendor = {
        id: row.id,
        name: row.name,
        description: row.description,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        website: row.website,
        address: row.address,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        category: row.category_id
          ? {
              id: row.category_id,
              name: row.category_name,
              description: row.category_description,
            }
          : null,
        latestSubmission: row.latest_submission_id
          ? {
              id: row.latest_submission_id,
              status: row.latest_submission_status,
              submittedAt: row.latest_submission_submitted_at,
              reviewedAt: row.latest_submission_reviewed_at,
              notes: row.latest_submission_notes,
            }
          : null,
      };

      return NextResponse.json({ vendor }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching vendor:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
