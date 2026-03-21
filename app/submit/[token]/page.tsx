import { notFound } from "next/navigation";
import { Pool } from "pg";
import SubmitClient from "./SubmitClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface PageProps {
  params: {
    token: string;
  };
}

export default async function SubmitPage({ params }: PageProps) {
  const { token } = params;

  let vendor: { id: number; name: string } | null = null;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT id, name FROM vendors WHERE submission_token = $1 LIMIT 1",
        [token],
      );

      if (result.rows.length > 0) {
        vendor = {
          id: result.rows[0].id,
          name: result.rows[0].name,
        };
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(
      "Database error looking up vendor by submission token:",
      error,
    );
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">
            An error occurred while processing your request. Please try again
            later.
          </p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Page Not Found
          </h1>
          <p className="text-gray-600">
            The submission link you used is invalid or has expired. Please
            contact your administrator for a new link.
          </p>
        </div>
      </div>
    );
  }

  return <SubmitClient vendorId={vendor.id} vendorName={vendor.name} />;
}
