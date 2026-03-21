import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getResend } from "@/lib/resend";

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find COIs expiring in the next 30 days
    const result = await query(
      `SELECT c.*, v.name as vendor_name, v.contact_email
       FROM cois c
       JOIN vendors v ON v.id = c.vendor_id
       WHERE c.expiration_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
         AND c.status = 'approved'
         AND (c.last_alert_sent IS NULL OR c.last_alert_sent < NOW() - INTERVAL '7 days')`,
      [],
    );

    const resend = getResend();
    let sent = 0;

    for (const coi of result.rows) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "noreply@example.com",
          to: coi.contact_email,
          subject: `COI Expiration Alert - ${coi.vendor_name}`,
          html: `
            <p>Your Certificate of Insurance for ${coi.vendor_name} is expiring on ${new Date(coi.expiration_date).toLocaleDateString()}.</p>
            <p>Please submit an updated COI to avoid any disruption.</p>
          `,
        });

        await query(`UPDATE cois SET last_alert_sent = NOW() WHERE id = $1`, [
          coi.id,
        ]);

        sent++;
      } catch (err) {
        console.error(`Failed to send alert for COI ${coi.id}:`, err);
      }
    }

    return NextResponse.json({ success: true, alertsSent: sent });
  } catch (error) {
    console.error("Expiration alerts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
