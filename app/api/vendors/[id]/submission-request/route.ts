import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: "Invalid vendor ID", details: parsedParams.error.flatten() },
        { status: 400 },
      );
    }

    const vendorId = parsedParams.data.id;

    const client = await pool.connect();
    try {
      const vendorResult = await client.query(
        "SELECT id FROM vendors WHERE id = $1",
        [vendorId],
      );

      if (vendorResult.rowCount === 0) {
        return NextResponse.json(
          { error: "Vendor not found" },
          { status: 404 },
        );
      }

      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const insertResult = await client.query(
        `INSERT INTO submission_requests (id, vendor_id, token, created_by, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, vendor_id, token, expires_at, created_at`,
        [
          uuidv4(),
          vendorId,
          token,
          session.user.email ?? session.user.name,
          expiresAt,
        ],
      );

      const submissionRequest = insertResult.rows[0];

      const baseUrl =
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        "http://localhost:3000";
      const submissionUrl = `${baseUrl}/submit/${token}`;

      return NextResponse.json(
        {
          submissionRequest: {
            id: submissionRequest.id,
            vendorId: submissionRequest.vendor_id,
            token: submissionRequest.token,
            expiresAt: submissionRequest.expires_at,
            createdAt: submissionRequest.created_at,
          },
          submissionUrl,
        },
        { status: 201 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating submission request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
