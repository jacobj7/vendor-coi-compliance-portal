import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const CreateCategorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  required_coverage_types: z.array(z.string()).default([]),
  min_coverage_amounts: z.record(z.string(), z.number()).default({}),
});

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
        id,
        name,
        description,
        required_coverage_types,
        min_coverage_amounts,
        created_at,
        updated_at
      FROM vendor_categories
      ORDER BY name ASC`,
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching vendor categories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch vendor categories" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();

    const parsed = CreateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { name, description, required_coverage_types, min_coverage_amounts } =
      parsed.data;

    const existingCheck = await client.query(
      "SELECT id FROM vendor_categories WHERE name = $1",
      [name],
    );

    if (existingCheck.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "A vendor category with this name already exists",
        },
        { status: 409 },
      );
    }

    const result = await client.query(
      `INSERT INTO vendor_categories (
        name,
        description,
        required_coverage_types,
        min_coverage_amounts,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING
        id,
        name,
        description,
        required_coverage_types,
        min_coverage_amounts,
        created_at,
        updated_at`,
      [
        name,
        description ?? null,
        JSON.stringify(required_coverage_types),
        JSON.stringify(min_coverage_amounts),
      ],
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating vendor category:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create vendor category" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
