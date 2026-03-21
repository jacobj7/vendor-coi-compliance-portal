"use client";

import { useState } from "react";

type Vendor = {
  id: string;
  name: string;
  email: string;
  compliance_status: "pending" | "approved" | "flagged" | "non_compliant";
  coi_count: number;
};

type DashboardClientProps = {
  vendors: Vendor[];
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  flagged: "bg-red-100 text-red-800 border-red-200",
  non_compliant: "bg-orange-100 text-orange-800 border-orange-200",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  flagged: "Flagged",
  non_compliant: "Non-Compliant",
};

export default function DashboardClient({
  vendors: initialVendors,
}: DashboardClientProps) {
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [loadingStates, setLoadingStates] = useState<
    Record<string, "approve" | "flag" | null>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleReview = async (vendorId: string, action: "approve" | "flag") => {
    setLoadingStates((prev) => ({ ...prev, [vendorId]: action }));
    setErrors((prev) => ({ ...prev, [vendorId]: "" }));

    try {
      const response = await fetch(`/api/coi/${vendorId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.message || `Request failed with status ${response.status}`,
        );
      }

      const data = await response.json();

      setVendors((prev) =>
        prev.map((vendor) =>
          vendor.id === vendorId
            ? {
                ...vendor,
                compliance_status:
                  action === "approve" ? "approved" : "flagged",
                ...(data.vendor || {}),
              }
            : vendor,
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setErrors((prev) => ({ ...prev, [vendorId]: message }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, [vendorId]: null }));
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              Vendor Name
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              Email
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              Compliance Status
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              COI Count
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {vendors.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-6 py-10 text-center text-sm text-gray-500"
              >
                No vendors found.
              </td>
            </tr>
          ) : (
            vendors.map((vendor) => {
              const isLoading = loadingStates[vendor.id];
              const error = errors[vendor.id];

              return (
                <tr
                  key={vendor.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {vendor.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    <a
                      href={`mailto:${vendor.email}`}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {vendor.email}
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        statusColors[vendor.compliance_status] ||
                        "bg-gray-100 text-gray-800 border-gray-200"
                      }`}
                    >
                      {statusLabels[vendor.compliance_status] ||
                        vendor.compliance_status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {vendor.coi_count}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReview(vendor.id, "approve")}
                          disabled={
                            !!isLoading ||
                            vendor.compliance_status === "approved"
                          }
                          className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Approve vendor ${vendor.name}`}
                        >
                          {isLoading === "approve" ? (
                            <span className="flex items-center gap-1">
                              <svg
                                className="h-3 w-3 animate-spin"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8v8H4z"
                                />
                              </svg>
                              Approving…
                            </span>
                          ) : (
                            "Approve"
                          )}
                        </button>
                        <button
                          onClick={() => handleReview(vendor.id, "flag")}
                          disabled={
                            !!isLoading ||
                            vendor.compliance_status === "flagged"
                          }
                          className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Flag vendor ${vendor.name}`}
                        >
                          {isLoading === "flag" ? (
                            <span className="flex items-center gap-1">
                              <svg
                                className="h-3 w-3 animate-spin"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8v8H4z"
                                />
                              </svg>
                              Flagging…
                            </span>
                          ) : (
                            "Flag"
                          )}
                        </button>
                      </div>
                      {error && (
                        <p className="text-xs text-red-600" role="alert">
                          {error}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
