import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    // Find vendors with expiring documents (within 30 days)
    const result = await db.query(`
      SELECT v.id, v.company_name, v.contact_email, v.contact_name,
             vd.document_type, vd.expiration_date
      FROM vendors v
      JOIN vendor_documents vd ON v.id = vd.vendor_id
      WHERE vd.expiration_date IS NOT NULL
        AND vd.expiration_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
        AND v.status = 'active'
      ORDER BY vd.expiration_date ASC
    `);

    const expiringDocs = result.rows;

    if (expiringDocs.length === 0) {
      return NextResponse.json({
        message: "No expiring documents found",
        sent: 0,
      });
    }

    // Only send emails if RESEND_API_KEY is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn(
        "RESEND_API_KEY not configured, skipping email notifications",
      );
      return NextResponse.json({
        message: "Email notifications skipped (no API key)",
        count: expiringDocs.length,
      });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    let sent = 0;
    for (const doc of expiringDocs) {
      try {
        const daysUntilExpiry = Math.ceil(
          (new Date(doc.expiration_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );

        await resend.emails.send({
          from: process.env.FROM_EMAIL || "noreply@example.com",
          to: doc.contact_email,
          subject: `Document Expiration Alert: ${doc.document_type}`,
          html: `
            <h2>Document Expiration Alert</h2>
            <p>Dear ${doc.contact_name || doc.company_name},</p>
            <p>Your <strong>${doc.document_type}</strong> document is expiring in <strong>${daysUntilExpiry} days</strong> (on ${new Date(doc.expiration_date).toLocaleDateString()}).</p>
            <p>Please update your documentation to maintain your vendor status.</p>
            <p>Thank you,<br/>Vendor Management Team</p>
          `,
        });
        sent++;
      } catch (emailError) {
        console.error(
          `Failed to send email to ${doc.contact_email}:`,
          emailError,
        );
      }
    }

    return NextResponse.json({
      message: "Expiration alerts sent",
      sent,
      total: expiringDocs.length,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
