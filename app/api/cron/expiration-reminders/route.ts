import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getResendClient } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find COIs expiring in 30 days or 7 days
    const result = await db.query(
      `SELECT 
        c.id as coi_id,
        c.expiration_date,
        c.policy_number,
        v.name as vendor_name,
        v.email as vendor_email,
        u.email as admin_email,
        u.name as admin_name
      FROM cois c
      JOIN vendors v ON c.vendor_id = v.id
      JOIN users u ON v.organization_id = u.organization_id AND u.role = 'admin'
      WHERE c.status = 'approved'
        AND c.expiration_date IS NOT NULL
        AND (
          (c.expiration_date::date = $1::date)
          OR (c.expiration_date::date = $2::date)
        )`,
      [thirtyDaysFromNow.toISOString(), sevenDaysFromNow.toISOString()],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ message: "No expiring COIs found", sent: 0 });
    }

    const resend = getResendClient();
    let sentCount = 0;

    for (const row of result.rows) {
      const daysUntilExpiry = Math.round(
        (new Date(row.expiration_date).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      try {
        // Notify vendor
        if (row.vendor_email) {
          await resend.emails.send({
            from: process.env.FROM_EMAIL || "noreply@example.com",
            to: row.vendor_email,
            subject: `COI Expiring in ${daysUntilExpiry} Days`,
            html: `
              <h2>Certificate of Insurance Expiration Notice</h2>
              <p>Dear ${row.vendor_name},</p>
              <p>Your Certificate of Insurance (Policy #${row.policy_number || "N/A"}) is expiring in <strong>${daysUntilExpiry} days</strong> on ${new Date(row.expiration_date).toLocaleDateString()}.</p>
              <p>Please submit an updated COI to avoid any service interruptions.</p>
              <p>Thank you,<br/>The Compliance Team</p>
            `,
          });
          sentCount++;
        }

        // Notify admin
        if (row.admin_email) {
          await resend.emails.send({
            from: process.env.FROM_EMAIL || "noreply@example.com",
            to: row.admin_email,
            subject: `Vendor COI Expiring in ${daysUntilExpiry} Days - ${row.vendor_name}`,
            html: `
              <h2>Vendor COI Expiration Alert</h2>
              <p>Dear ${row.admin_name || "Admin"},</p>
              <p>The COI for vendor <strong>${row.vendor_name}</strong> (Policy #${row.policy_number || "N/A"}) is expiring in <strong>${daysUntilExpiry} days</strong> on ${new Date(row.expiration_date).toLocaleDateString()}.</p>
              <p>Please follow up with the vendor to ensure they submit an updated certificate.</p>
            `,
          });
          sentCount++;
        }
      } catch (emailError) {
        console.error(
          `Failed to send email for COI ${row.coi_id}:`,
          emailError,
        );
      }
    }

    return NextResponse.json({
      message: "Expiration reminders sent",
      processed: result.rows.length,
      sent: sentCount,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
