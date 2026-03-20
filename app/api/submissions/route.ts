import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import Anthropic from "@anthropic-ai/sdk";
import { Pool } from "pg";
import { z } from "zod";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const FormSchema = z.object({
  vendor_id: z.string().min(1, "vendor_id is required"),
});

const ExtractedDataSchema = z.object({
  insurer_name: z.string().nullable().optional(),
  policy_number: z.string().nullable().optional(),
  coverage_type: z.string().nullable().optional(),
  coverage_limit: z.string().nullable().optional(),
  effective_date: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const vendor_id = formData.get("vendor_id");
    const file = formData.get("file");

    if (!vendor_id || typeof vendor_id !== "string") {
      return NextResponse.json(
        { error: "vendor_id is required" },
        { status: 400 },
      );
    }

    const validation = FormSchema.safeParse({ vendor_id });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors },
        { status: 400 },
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    const blobResult = await put(
      `coi/${vendor_id}/${Date.now()}-${file.name}`,
      fileBytes,
      {
        access: "public",
        contentType: file.type || "application/octet-stream",
      },
    );

    const fileText = new TextDecoder("utf-8").decode(fileBytes);

    const prompt = `You are an expert at extracting information from Certificates of Insurance (COI) documents.

Please analyze the following COI document text and extract the following information:
1. insurer_name - The name of the insurance company
2. policy_number - The policy number
3. coverage_type - The type of coverage (e.g., General Liability, Workers Compensation, etc.)
4. coverage_limit - The coverage limit amount
5. effective_date - The effective date of the policy (in YYYY-MM-DD format if possible)
6. expiration_date - The expiration date of the policy (in YYYY-MM-DD format if possible)

Document text:
${fileText}

Respond ONLY with a valid JSON object containing these fields. Use null for any fields you cannot find. Example:
{
  "insurer_name": "Example Insurance Co.",
  "policy_number": "POL-123456",
  "coverage_type": "General Liability",
  "coverage_limit": "$1,000,000",
  "effective_date": "2024-01-01",
  "expiration_date": "2025-01-01"
}`;

    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    let extractedData: z.infer<typeof ExtractedDataSchema> = {
      insurer_name: null,
      policy_number: null,
      coverage_type: null,
      coverage_limit: null,
      effective_date: null,
      expiration_date: null,
    };

    const responseContent = message.content[0];
    if (responseContent.type === "text") {
      try {
        const jsonMatch = responseContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const extractedValidation = ExtractedDataSchema.safeParse(parsed);
          if (extractedValidation.success) {
            extractedData = extractedValidation.data;
          }
        }
      } catch (parseError) {
        console.error("Failed to parse Claude response:", parseError);
      }
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO certificates_of_insurance 
          (vendor_id, file_url, status, extracted_data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, vendor_id, file_url, status, extracted_data, created_at, updated_at`,
        [vendor_id, blobResult.url, "pending", JSON.stringify(extractedData)],
      );

      const certificate = result.rows[0];

      return NextResponse.json(
        {
          id: certificate.id,
          vendor_id: certificate.vendor_id,
          file_url: certificate.file_url,
          status: certificate.status,
          extracted_data: certificate.extracted_data,
          created_at: certificate.created_at,
          updated_at: certificate.updated_at,
        },
        { status: 201 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error processing submission:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
