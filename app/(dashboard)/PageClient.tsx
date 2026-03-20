"use client";

import { useState, useMemo } from "react";

interface Vendor {
  id: string;
  name: string;
  email: string;
  compliance_status:
    | "compliant"
    | "expiring_soon"
    | "non_compliant"
    | "pending";
  last_updated: string;
  expiry_date: string | null;
}

interface SummaryCardProps {
  title: string;
  count: number;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

interface PageClientProps {
  vendors: Vendor[];
}

function SummaryCard({
  title,
  count,
  color,
  bgColor,
  borderColor,
  icon,
}: SummaryCardProps) {
  return (
    <div
      className={`rounded-xl border ${borderColor} ${bgColor} p-6 flex items-center gap-4 shadow-sm`}
    >
      <div
        className={`flex items-center justify-center w-12 h-12 rounded-full ${color} bg-white shadow-sm`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={`text-3xl font-bold ${color}`}>{count}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Vendor["compliance_status"] }) {
  const config = {
    compliant: {
      label: "Compliant",
      className: "bg-green-100 text-green-800 border border-green-200",
    },
    expiring_soon: {
      label: "Expiring Soon",
      className: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    },
    non_compliant: {
      label: "Non-Compliant",
      className: "bg-red-100 text-red-800 border border-red-200",
    },
    pending: {
      label: "Pending",
      className: "bg-gray-100 text-gray-700 border border-gray-200",
    },
  };

  const { label, className } = config[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PageClient({ vendors }: PageClientProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const summary = useMemo(() => {
    return {
      compliant: vendors.filter((v) => v.compliance_status === "compliant")
        .length,
      expiring_soon: vendors.filter(
        (v) => v.compliance_status === "expiring_soon",
      ).length,
      non_compliant: vendors.filter(
        (v) => v.compliance_status === "non_compliant",
      ).length,
      pending: vendors.filter((v) => v.compliance_status === "pending").length,
    };
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    if (statusFilter === "all") return vendors;
    return vendors.filter((v) => v.compliance_status === statusFilter);
  }, [vendors, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Compliance Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor and manage vendor compliance status
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Compliant"
            count={summary.compliant}
            color="text-green-600"
            bgColor="bg-green-50"
            borderColor="border-green-200"
            icon={
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <SummaryCard
            title="Expiring Soon"
            count={summary.expiring_soon}
            color="text-yellow-600"
            bgColor="bg-yellow-50"
            borderColor="border-yellow-200"
            icon={
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <SummaryCard
            title="Non-Compliant"
            count={summary.non_compliant}
            color="text-red-600"
            bgColor="bg-red-50"
            borderColor="border-red-200"
            icon={
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <SummaryCard
            title="Pending"
            count={summary.pending}
            color="text-gray-600"
            bgColor="bg-gray-100"
            borderColor="border-gray-200"
            icon={
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        </div>

        {/* Vendor Table Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Table Header with Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Vendors</h2>
              <p className="text-sm text-gray-500">
                Showing {filteredVendors.length} of {vendors.length} vendors
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="status-filter"
                className="text-sm font-medium text-gray-700 whitespace-nowrap"
              >
                Filter by status:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="compliant">Compliant</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="non_compliant">Non-Compliant</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Vendor Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Compliance Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Expiry Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-sm text-gray-400"
                    >
                      No vendors found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {vendor.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {vendor.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={vendor.compliance_status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(vendor.expiry_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(vendor.last_updated)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
