import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export { client };

export interface COIData {
  policyNumber: string | null;
  insuredName: string | null;
  insuredAddress: string | null;
  insurerName: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  generalLiabilityLimit: string | null;
  autoLiabilityLimit: string | null;
  workersCompLimit: string | null;
  umbrellaLimit: string | null;
  additionalInsured: string | null;
  certificateHolder: string | null;
  producerName: string | null;
  producerAddress: string | null;
  producerPhone: string | null;
  producerEmail: string | null;
  projectDescription: string | null;
  rawText: string | null;
}

export async function extractCOIData(fileUrl: string): Promise<COIData> {
  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are an expert at extracting information from Certificates of Insurance (COI) documents. 
            
Please analyze the COI document at the following URL and extract all relevant fields. Return ONLY a valid JSON object with no additional text, markdown, or explanation.

Document URL: ${fileUrl}

Extract the following fields and return them in this exact JSON structure:
{
  "policyNumber": "the policy number or null if not found",
  "insuredName": "name of the insured party or null if not found",
  "insuredAddress": "address of the insured or null if not found",
  "insurerName": "name of the insurance company or null if not found",
  "effectiveDate": "policy effective date in YYYY-MM-DD format or null if not found",
  "expirationDate": "policy expiration date in YYYY-MM-DD format or null if not found",
  "generalLiabilityLimit": "general liability coverage limit or null if not found",
  "autoLiabilityLimit": "auto liability coverage limit or null if not found",
  "workersCompLimit": "workers compensation limit or null if not found",
  "umbrellaLimit": "umbrella/excess liability limit or null if not found",
  "additionalInsured": "additional insured parties or null if not found",
  "certificateHolder": "certificate holder name and address or null if not found",
  "producerName": "insurance producer/agent name or null if not found",
  "producerAddress": "insurance producer/agent address or null if not found",
  "producerPhone": "insurance producer/agent phone number or null if not found",
  "producerEmail": "insurance producer/agent email or null if not found",
  "projectDescription": "description of operations or project or null if not found",
  "rawText": "a brief summary of the key information found in the document"
}

Important: Return ONLY the JSON object, no other text.`,
          },
        ],
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  let parsedData: COIData;

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }
    parsedData = JSON.parse(jsonMatch[0]);
  } catch {
    parsedData = {
      policyNumber: null,
      insuredName: null,
      insuredAddress: null,
      insurerName: null,
      effectiveDate: null,
      expirationDate: null,
      generalLiabilityLimit: null,
      autoLiabilityLimit: null,
      workersCompLimit: null,
      umbrellaLimit: null,
      additionalInsured: null,
      certificateHolder: null,
      producerName: null,
      producerAddress: null,
      producerPhone: null,
      producerEmail: null,
      projectDescription: null,
      rawText: responseText || null,
    };
  }

  return parsedData;
}
