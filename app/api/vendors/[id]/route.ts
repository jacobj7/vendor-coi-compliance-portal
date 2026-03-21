import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const result = await query(
      `SELECT v.*, 
        json_agg(c ORDER BY c.created_at DESC) FILTER (WHERE c.id IS NOT NULL) as cois
       FROM vendors v
       LEFT JOIN cois c ON c.vendor_id = v.id
       WHERE v.id = $1
       GROUP BY v.id`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Get vendor error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();

    const schema = z.object({
      name: z.string().min(1).optional(),
      contactEmail: z.string().email().optional(),
      contactName: z.string().optional(),
      status: z.string().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (parsed.data.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(parsed.data.name);
    }
    if (parsed.data.contactEmail !== undefined) {
      updates.push(`contact_email = $${idx++}`);
      values.push(parsed.data.contactEmail);
    }
    if (parsed.data.contactName !== undefined) {
      updates.push(`contact_name = $${idx++}`);
      values.push(parsed.data.contactName);
    }
    if (parsed.data.status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(parsed.data.status);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    values.push(id);
    const result = await query(
      `UPDATE vendors SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Update vendor error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    await query("DELETE FROM vendors WHERE id = $1", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete vendor error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
