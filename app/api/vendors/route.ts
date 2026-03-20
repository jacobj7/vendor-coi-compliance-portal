import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CreateVendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  category_id: z
    .number()
    .int()
    .positive("Category ID must be a positive integer"),
});

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        v.id,
        v.name,
        v.email,
        v.invite_token,
        v.compliance_status,
        v.created_at,
        v.updated_at,
        c.id AS category_id,
        c.name AS category_name
      FROM vendors v
      LEFT JOIN categories c ON v.category_id = c.id
      ORDER BY v.created_at DESC
    `);

    return NextResponse.json({ vendors: result.rows }, { status: 200 });
  } catch (error) {
    console.error("GET /api/vendors error:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendors" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = CreateVendorSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { name, email, category_id } = parseResult.data;

    const invite_token = randomBytes(32).toString("hex");

    const result = await client.query(
      `
      INSERT INTO vendors (name, email, category_id, invite_token, compliance_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())
      RETURNING id, name, email, category_id, invite_token, compliance_status, created_at, updated_at
      `,
      [name, email, category_id, invite_token],
    );

    const vendor = result.rows[0];

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/vendors error:", error);

    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "23505"
    ) {
      return NextResponse.json(
        { error: "A vendor with this email already exists" },
        { status: 409 },
      );
    }

    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "23503"
    ) {
      return NextResponse.json(
        { error: "Invalid category_id: category does not exist" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create vendor" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
