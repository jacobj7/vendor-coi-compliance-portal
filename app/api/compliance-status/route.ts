import { NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  const client = await pool.connect();
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    const nowIso = now.toISOString();
    const thirtyDaysIso = thirtyDaysFromNow.toISOString();

    const totalResult = await client.query(
      `SELECT COUNT(*) AS total FROM vendors`,
    );

    const compliantResult = await client.query(
      `SELECT COUNT(*) AS compliant
       FROM vendors
       WHERE compliance_status = 'compliant'
         AND (compliance_expiry_date IS NULL OR compliance_expiry_date > $1)`,
      [thirtyDaysIso],
    );

    const expiringSoonResult = await client.query(
      `SELECT COUNT(*) AS expiring_soon
       FROM vendors
       WHERE compliance_expiry_date >= $1
         AND compliance_expiry_date <= $2`,
      [nowIso, thirtyDaysIso],
    );

    const nonCompliantResult = await client.query(
      `SELECT COUNT(*) AS non_compliant
       FROM vendors
       WHERE compliance_status = 'non_compliant'
          OR compliance_expiry_date < $1`,
      [nowIso],
    );

    const expiringSoonVendorsResult = await client.query(
      `SELECT id, name, compliance_status, compliance_expiry_date
       FROM vendors
       WHERE compliance_expiry_date >= $1
         AND compliance_expiry_date <= $2
       ORDER BY compliance_expiry_date ASC`,
      [nowIso, thirtyDaysIso],
    );

    const metrics = {
      total_vendors: parseInt(totalResult.rows[0].total, 10),
      compliant_count: parseInt(compliantResult.rows[0].compliant, 10),
      expiring_soon_count: parseInt(
        expiringSoonResult.rows[0].expiring_soon,
        10,
      ),
      non_compliant_count: parseInt(
        nonCompliantResult.rows[0].non_compliant,
        10,
      ),
      vendors_expiring_soon: expiringSoonVendorsResult.rows,
    };

    return NextResponse.json(metrics, { status: 200 });
  } catch (error) {
    console.error("Error fetching compliance status:", error);
    return NextResponse.json(
      { error: "Failed to fetch compliance metrics" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
