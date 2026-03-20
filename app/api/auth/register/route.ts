import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, email, password } = parseResult.data;

    const client = await pool.connect();
    try {
      const existingUser = await client.query(
        "SELECT id FROM coordinators WHERE email = $1",
        [email],
      );

      if (existingUser.rows.length > 0) {
        return NextResponse.json(
          { error: "A coordinator with this email already exists" },
          { status: 409 },
        );
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const result = await client.query(
        `INSERT INTO coordinators (name, email, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id, name, email, created_at`,
        [name, email, passwordHash],
      );

      const newCoordinator = result.rows[0];

      return NextResponse.json(
        {
          message: "Coordinator registered successfully",
          coordinator: {
            id: newCoordinator.id,
            name: newCoordinator.name,
            email: newCoordinator.email,
            createdAt: newCoordinator.created_at,
          },
        },
        { status: 201 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
