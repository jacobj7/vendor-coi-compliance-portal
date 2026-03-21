"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import StatusBadge from "@/components/StatusBadge";

interface COI {
  id: string;
  status: string;
  uploaded_at: string;
  expiration_date: string | null;
  policy_number: string | null;
  insurer: string | null;
  coverage_amount: number | null;
  notes: string | null;
}

interface Vendor {
  id: string;
  name: string;
  email: string;
  created_at: string;
  cois: COI[];
}

interface Props {
  vendorId: string;
}

export default function VendorDetailClient({ vendorId }: Props) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVendor() {
      try {
        const res = await fetch(`/api/vendors/${vendorId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch vendor");
        }
        const data = await res.json();
        setVendor(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchVendor();
  }, [vendorId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading vendor details...</p>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error || "Vendor not found"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
        <p className="text-gray-600">{vendor.email}</p>
        <p className="text-sm text-gray-400">
          Added {format(new Date(vendor.created_at), "MMM d, yyyy")}
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Certificates of Insurance
          </h2>
        </div>

        {vendor.cois.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No certificates uploaded yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {vendor.cois.map((coi) => (
              <li key={coi.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <StatusBadge status={coi.status} />
                      {coi.policy_number && (
                        <span className="text-sm text-gray-600">
                          Policy: {coi.policy_number}
                        </span>
                      )}
                    </div>
                    {coi.insurer && (
                      <p className="text-sm text-gray-700">
                        Insurer: {coi.insurer}
                      </p>
                    )}
                    {coi.coverage_amount && (
                      <p className="text-sm text-gray-700">
                        Coverage: ${coi.coverage_amount.toLocaleString()}
                      </p>
                    )}
                    {coi.expiration_date && (
                      <p className="text-sm text-gray-500">
                        Expires:{" "}
                        {format(new Date(coi.expiration_date), "MMM d, yyyy")}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      Uploaded:{" "}
                      {format(new Date(coi.uploaded_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                {coi.notes && (
                  <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                    {coi.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
