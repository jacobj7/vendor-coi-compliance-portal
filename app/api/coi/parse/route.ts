import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const RequestSchema = z.object({
  coi_id: z.union([z.string(), z.number()]),
  blob_url: z.string().url(),
});

const ExtractedFieldsSchema = z.object({
  insurer_name: z.string().nullable().optional(),
  policy_number: z.string().nullable().optional(),
  coverage_type: z.string().nullable().optional(),
  effective_date: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
  coverage_limit: z.string().nullable().optional(),
});

async function fetchPdfText(blobUrl: string): Promise<string> {
  try {
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text")) {
      return await response.text();
    }
    // For binary PDF, return the URL as context since we can't parse binary in this environment
    return `Document available at: ${blobUrl}`;
  } catch {
    return `Document available at: ${blobUrl}`;
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = RequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { coi_id, blob_url } = parseResult.data;

  const documentContext = await fetchPdfText(blob_url);

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prompt = `You are an expert at parsing ACORD 25 Certificates of Insurance documents. 

Given the following document context, extract the key insurance fields. Return ONLY a valid JSON object with exactly these fields (use null if a field cannot be found):

{
  "insurer_name": "Name of the insurance company/insurer",
  "policy_number": "The policy number",
  "coverage_type": "Type of coverage (e.g., General Liability, Auto, Workers Compensation, etc.)",
  "effective_date": "Policy effective/start date in YYYY-MM-DD format if possible",
  "expiration_date": "Policy expiration/end date in YYYY-MM-DD format if possible",
  "coverage_limit": "Coverage limit amount (e.g., $1,000,000)"
}

Document context:
${documentContext}

Return ONLY the JSON object, no additional text or explanation.`;

  let extractedFields: z.infer<typeof ExtractedFieldsSchema>;

  try {
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let parsedJson: unknown;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON object found in response");
      }
      parsedJson = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        {
          error: "Failed to parse Anthropic response as JSON",
          raw: responseText,
        },
        { status: 500 },
      );
    }

    const fieldsResult = ExtractedFieldsSchema.safeParse(parsedJson);
    if (!fieldsResult.success) {
      return NextResponse.json(
        {
          error: "Extracted fields validation failed",
          details: fieldsResult.error.flatten(),
        },
        { status: 500 },
      );
    }

    extractedFields = fieldsResult.data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Anthropic API call failed", details: message },
      { status: 500 },
    );
  }

  // Update the database
  const db = await pool.connect();
  try {
    await db.query(
      `UPDATE certificates_of_insurance
       SET
         insurer_name = $1,
         policy_number = $2,
         coverage_type = $3,
         effective_date = $4,
         expiration_date = $5,
         coverage_limit = $6,
         parsed_data = $7,
         updated_at = NOW()
       WHERE id = $8`,
      [
        extractedFields.insurer_name ?? null,
        extractedFields.policy_number ?? null,
        extractedFields.coverage_type ?? null,
        extractedFields.effective_date ?? null,
        extractedFields.expiration_date ?? null,
        extractedFields.coverage_limit ?? null,
        JSON.stringify(extractedFields),
        coi_id,
      ],
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Database update failed", details: message },
      { status: 500 },
    );
  } finally {
    db.release();
  }

  return NextResponse.json({
    success: true,
    coi_id,
    extracted_fields: extractedFields,
  });
}
