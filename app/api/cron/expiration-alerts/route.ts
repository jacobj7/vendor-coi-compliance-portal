import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not set, skipping email notifications");
      return NextResponse.json({
        message: "Email notifications skipped: no API key configured",
      });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);

    // Find submissions expiring in the next 30 days
    const result = await pool.query(
      `SELECT s.id, s.vendor_id, s.expiration_date, v.name as vendor_name, v.contact_email
       FROM submissions s
       JOIN vendors v ON s.vendor_id = v.id
       WHERE s.status = 'approved'
         AND s.expiration_date IS NOT NULL
         AND s.expiration_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
         AND s.alert_sent = false`,
      [],
    );

    const expiring = result.rows;

    let emailsSent = 0;
    for (const submission of expiring) {
      if (submission.contact_email) {
        try {
          await resend.emails.send({
            from: process.env.FROM_EMAIL || "noreply@example.com",
            to: submission.contact_email,
            subject: `Certificate of Insurance Expiring Soon - ${submission.vendor_name}`,
            html: `
              <p>Dear ${submission.vendor_name},</p>
              <p>Your Certificate of Insurance is expiring on ${new Date(submission.expiration_date).toLocaleDateString()}.</p>
              <p>Please submit an updated certificate to avoid any disruption.</p>
            `,
          });

          // Mark alert as sent
          await pool.query(
            "UPDATE submissions SET alert_sent = true WHERE id = $1",
            [submission.id],
          );

          emailsSent++;
        } catch (emailError) {
          console.error(
            `Failed to send email for submission ${submission.id}:`,
            emailError,
          );
        }
      }
    }

    return NextResponse.json({
      message: `Processed ${expiring.length} expiring submissions, sent ${emailsSent} emails`,
    });
  } catch (error) {
    console.error("Expiration alerts cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
