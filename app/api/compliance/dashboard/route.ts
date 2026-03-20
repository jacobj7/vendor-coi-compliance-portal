import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT
          compliance_status,
          COUNT(*) as count
        FROM vendors
        GROUP BY compliance_status
      `);

      const totalResult = await client.query(`
        SELECT COUNT(*) as total FROM vendors
      `);

      const counts: Record<string, number> = {
        compliant: 0,
        expiring_soon: 0,
        expired: 0,
        pending_review: 0,
      };

      for (const row of result.rows) {
        const status = row.compliance_status as string;
        if (status in counts) {
          counts[status] = parseInt(row.count, 10);
        }
      }

      const total = parseInt(totalResult.rows[0].total, 10);

      return NextResponse.json({
        counts,
        total,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching compliance dashboard data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
