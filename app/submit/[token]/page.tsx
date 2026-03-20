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
      "SELECT id, name, email, invite_token FROM vendors WHERE invite_token = $1 LIMIT 1",
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Certificate of Insurance Upload
          </h1>
          <p className="mt-2 text-center text-gray-600">
            Welcome, <span className="font-semibold">{vendor.name}</span>
          </p>
          <p className="mt-1 text-center text-sm text-gray-500">
            Please upload your Certificate of Insurance (COI) document below.
          </p>
        </div>
        <SubmitPageClient
          vendorId={vendor.id}
          vendorName={vendor.name}
          token={token}
        />
      </div>
    </div>
  );
}
