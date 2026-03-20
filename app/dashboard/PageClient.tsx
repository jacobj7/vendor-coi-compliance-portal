"use client";

import Link from "next/link";

interface ComplianceBucket {
  label: string;
  count: number;
  status: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: string;
}

interface DashboardPageClientProps {
  compliantCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  pendingReviewCount: number;
}

export default function DashboardPageClient({
  compliantCount,
  expiringSoonCount,
  expiredCount,
  pendingReviewCount,
}: DashboardPageClientProps) {
  const buckets: ComplianceBucket[] = [
    {
      label: "Compliant",
      count: compliantCount,
      status: "compliant",
      color: "green",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700",
      icon: "✅",
    },
    {
      label: "Expiring Soon",
      count: expiringSoonCount,
      status: "expiring_soon",
      color: "yellow",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-700",
      icon: "⚠️",
    },
    {
      label: "Expired",
      count: expiredCount,
      status: "expired",
      color: "red",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-700",
      icon: "❌",
    },
    {
      label: "Pending Review",
      count: pendingReviewCount,
      status: "pending_review",
      color: "blue",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-700",
      icon: "🔍",
    },
  ];

  const totalVendors =
    compliantCount + expiringSoonCount + expiredCount + pendingReviewCount;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Compliance Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Overview of vendor compliance status across your organization
          </p>
        </div>

        {/* Summary Bar */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">Total Vendors</span>
              <p className="text-2xl font-semibold text-gray-900">
                {totalVendors}
              </p>
            </div>
            <Link
              href="/vendors"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors duration-200"
            >
              View All Vendors
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Compliance Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {buckets.map((bucket) => (
            <Link
              key={bucket.status}
              href={`/vendors?status=${bucket.status}`}
              className={`block rounded-xl border-2 ${bucket.borderColor} ${bucket.bgColor} p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 group`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl mb-2">{bucket.icon}</div>
                  <p
                    className={`text-sm font-medium ${bucket.textColor} uppercase tracking-wide`}
                  >
                    {bucket.label}
                  </p>
                  <p className={`mt-2 text-4xl font-bold ${bucket.textColor}`}>
                    {bucket.count}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {bucket.count === 1 ? "vendor" : "vendors"}
                  </p>
                </div>
                <div
                  className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${bucket.textColor}`}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>

              {/* Progress bar showing proportion of total */}
              <div className="mt-4">
                <div className="w-full bg-white bg-opacity-60 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      bucket.color === "green"
                        ? "bg-green-500"
                        : bucket.color === "yellow"
                          ? "bg-yellow-500"
                          : bucket.color === "red"
                            ? "bg-red-500"
                            : "bg-blue-500"
                    }`}
                    style={{
                      width:
                        totalVendors > 0
                          ? `${Math.round((bucket.count / totalVendors) * 100)}%`
                          : "0%",
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 text-right">
                  {totalVendors > 0
                    ? `${Math.round((bucket.count / totalVendors) * 100)}%`
                    : "0%"}{" "}
                  of total
                </p>
              </div>

              <div
                className={`mt-3 text-xs font-medium ${bucket.textColor} group-hover:underline`}
              >
                View {bucket.label} vendors →
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/vendors/new"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors duration-200"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add New Vendor
            </Link>
            <Link
              href={`/vendors?status=expiring_soon`}
              className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-md hover:bg-yellow-200 transition-colors duration-200 border border-yellow-300"
            >
              <svg
                className="mr-2 h-4 w-4"
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
              Review Expiring Soon
            </Link>
            <Link
              href={`/vendors?status=expired`}
              className="inline-flex items-center px-4 py-2 bg-red-100 text-red-800 text-sm font-medium rounded-md hover:bg-red-200 transition-colors duration-200 border border-red-300"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Address Expired
            </Link>
            <Link
              href={`/vendors?status=pending_review`}
              className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-md hover:bg-blue-200 transition-colors duration-200 border border-blue-300"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Complete Pending Reviews
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
