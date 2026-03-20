import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

const COIFieldsSchema = z.object({
  insurer_name: z.string().nullable(),
  policy_number: z.string().nullable(),
  coverage_type: z.string().nullable(),
  coverage_amount: z.string().nullable(),
  effective_date: z.string().nullable(),
  expiration_date: z.string().nullable(),
  insured_name: z.string().nullable(),
});

export type COIFields = z.infer<typeof COIFieldsSchema>;

export async function extractCOIFields(pdfText: string): Promise<COIFields> {
  const prompt = `You are an expert at extracting information from Certificates of Insurance (COI) documents.

Given the following text extracted from a COI PDF document, extract the following fields and return them as a JSON object:
- insurer_name: The name of the insurance company
- policy_number: The policy number
- coverage_type: The type of coverage (e.g., General Liability, Workers Compensation, etc.)
- coverage_amount: The coverage amount or limit
- effective_date: The date the policy becomes effective (in ISO 8601 format if possible)
- expiration_date: The date the policy expires (in ISO 8601 format if possible)
- insured_name: The name of the insured party

If a field cannot be found in the text, set its value to null.

Return ONLY a valid JSON object with these exact field names. Do not include any explanation or additional text.

PDF Text:
${pdfText}`;

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

  const responseContent = message.content[0];

  if (responseContent.type !== "text") {
    throw new Error("Unexpected response type from Anthropic API");
  }

  const responseText = responseContent.text.trim();

  let parsedJSON: unknown;
  try {
    parsedJSON = JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Anthropic response");
    }
    parsedJSON = JSON.parse(jsonMatch[0]);
  }

  const validatedFields = COIFieldsSchema.parse(parsedJSON);

  return validatedFields;
}
