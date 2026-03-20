import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: "Invalid submission ID" },
        { status: 400 },
      );
    }

    const client = await pool.connect();

    try {
      const submissionQuery = `
        SELECT
          s.id,
          s.status,
          s.created_at,
          s.updated_at,
          s.file_name,
          s.file_url,
          s.file_type,
          s.raw_text,
          s.user_id,
          v.id AS vendor_id,
          v.name AS vendor_name,
          v.email AS vendor_email,
          v.phone AS vendor_phone,
          v.address AS vendor_address,
          v.website AS vendor_website,
          v.created_at AS vendor_created_at,
          ed.id AS extracted_data_id,
          ed.invoice_number,
          ed.invoice_date,
          ed.due_date,
          ed.total_amount,
          ed.tax_amount,
          ed.subtotal,
          ed.currency,
          ed.line_items,
          ed.payment_terms,
          ed.notes,
          ed.confidence_score,
          ed.extracted_at
        FROM submissions s
        LEFT JOIN vendors v ON s.vendor_id = v.id
        LEFT JOIN extracted_data ed ON s.id = ed.submission_id
        WHERE s.id = $1
      `;

      const result = await client.query(submissionQuery, [id]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: "Submission not found" },
          { status: 404 },
        );
      }

      const row = result.rows[0];

      const userRole = (session.user as { role?: string }).role;
      if (
        userRole !== "admin" &&
        row.user_id !== (session.user as { id?: string }).id
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const submission = {
        id: row.id,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        fileName: row.file_name,
        fileUrl: row.file_url,
        fileType: row.file_type,
        rawText: row.raw_text,
        userId: row.user_id,
        vendor: row.vendor_id
          ? {
              id: row.vendor_id,
              name: row.vendor_name,
              email: row.vendor_email,
              phone: row.vendor_phone,
              address: row.vendor_address,
              website: row.vendor_website,
              createdAt: row.vendor_created_at,
            }
          : null,
        extractedData: row.extracted_data_id
          ? {
              id: row.extracted_data_id,
              invoiceNumber: row.invoice_number,
              invoiceDate: row.invoice_date,
              dueDate: row.due_date,
              totalAmount: row.total_amount,
              taxAmount: row.tax_amount,
              subtotal: row.subtotal,
              currency: row.currency,
              lineItems: row.line_items,
              paymentTerms: row.payment_terms,
              notes: row.notes,
              confidenceScore: row.confidence_score,
              extractedAt: row.extracted_at,
            }
          : null,
      };

      return NextResponse.json({ submission }, { status: 200 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
