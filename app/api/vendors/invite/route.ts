import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { getResend } from "@/lib/resend";
import { z } from "zod";
import crypto from "crypto";

const inviteSchema = z.object({
  vendorName: z.string().min(1),
  contactEmail: z.string().email(),
  contactName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { vendorName, contactEmail, contactName } = parsed.data;

    // Create a submission token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Insert vendor record
    const vendorResult = await query(
      `INSERT INTO vendors (name, contact_email, contact_name, status, created_by)
       VALUES ($1, $2, $3, 'invited', $4)
       ON CONFLICT (contact_email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [vendorName, contactEmail, contactName || null, session.user.id],
    );

    const vendorId = vendorResult.rows[0]?.id;

    if (vendorId) {
      await query(
        `INSERT INTO submission_tokens (token, vendor_id, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [token, vendorId, expiresAt],
      );
    }

    // Send invite email
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const submitUrl = `${baseUrl}/submit/${token}`;

    try {
      const resend = getResend();
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "noreply@example.com",
        to: contactEmail,
        subject: `COI Submission Request`,
        html: `
          <p>Hello ${contactName || "there"},</p>
          <p>You have been invited to submit your Certificate of Insurance.</p>
          <p><a href="${submitUrl}">Click here to submit your COI</a></p>
          <p>This link expires in 30 days.</p>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ success: true, token, submitUrl });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
