import { notFound } from "next/navigation";
import { Pool } from "pg";
import SubmitPageClient from "./SubmitPageClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface PageProps {
  params: { token: string };
}

async function getVendorByToken(token: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, name, email FROM vendors WHERE invite_token = $1 AND invite_token IS NOT NULL",
      [token],
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export default async function SubmitPage({ params }: PageProps) {
  const { token } = params;

  if (!token) {
    notFound();
  }

  const vendor = await getVendorByToken(token);

  if (!vendor) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Certificate of Insurance Submission
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Submitting on behalf of{" "}
            <span className="font-semibold text-gray-800">{vendor.name}</span>
          </p>
        </div>
        <SubmitPageClient token={token} vendorName={vendor.name} />
      </div>
    </div>
  );
}
