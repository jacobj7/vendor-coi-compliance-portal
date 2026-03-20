import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

interface ComplianceMetrics {
  compliant: number;
  expiring: number;
  nonCompliant: number;
}

interface ExpiringVendor {
  id: string;
  name: string;
  expirationDate: string;
  daysUntilExpiration: number;
  complianceType: string;
}

interface ComplianceStatusResponse {
  metrics: ComplianceMetrics;
  expiringVendors: ExpiringVendor[];
}

async function getComplianceStatus(): Promise<ComplianceStatusResponse> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/compliance-status`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch compliance status: ${response.statusText}`,
    );
  }

  return response.json();
}

function MetricCard({
  title,
  count,
  colorClass,
  bgClass,
}: {
  title: string;
  count: number;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div className={`rounded-xl p-6 shadow-sm border ${bgClass}`}>
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
        {title}
      </p>
      <p className={`mt-2 text-4xl font-bold ${colorClass}`}>{count}</p>
    </div>
  );
}

function ExpiringVendorRow({ vendor }: { vendor: ExpiringVendor }) {
  const urgencyClass =
    vendor.daysUntilExpiration <= 7
      ? "bg-red-100 text-red-800"
      : vendor.daysUntilExpiration <= 14
        ? "bg-orange-100 text-orange-800"
        : "bg-yellow-100 text-yellow-800";

  const formattedDate = new Date(vendor.expirationDate).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4 text-sm font-medium text-gray-900">
        {vendor.name}
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">
        {vendor.complianceType}
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">{formattedDate}</td>
      <td className="py-3 px-4">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${urgencyClass}`}
        >
          {vendor.daysUntilExpiration} day
          {vendor.daysUntilExpiration !== 1 ? "s" : ""}
        </span>
      </td>
    </tr>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin");
  }

  let data: ComplianceStatusResponse | null = null;
  let error: string | null = null;

  try {
    data = await getComplianceStatus();
  } catch (err) {
    error = err instanceof Error ? err.message : "An unexpected error occurred";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Compliance Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {session.user?.name || session.user?.email}.
            Here&apos;s your compliance overview.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-6">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-red-400 mr-3"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Error loading compliance data
                </h3>
                <p className="mt-1 text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <MetricCard
                title="Compliant"
                count={data.metrics.compliant}
                colorClass="text-green-600"
                bgClass="bg-white border-green-100"
              />
              <MetricCard
                title="Expiring Soon"
                count={data.metrics.expiring}
                colorClass="text-yellow-600"
                bgClass="bg-white border-yellow-100"
              />
              <MetricCard
                title="Non-Compliant"
                count={data.metrics.nonCompliant}
                colorClass="text-red-600"
                bgClass="bg-white border-red-100"
              />
            </div>

            {/* Expiring Vendors Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">
                  Vendors Expiring Within 30 Days
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  {data.expiringVendors.length} vendor
                  {data.expiringVendors.length !== 1 ? "s" : ""} require
                  attention
                </p>
              </div>

              {data.expiringVendors.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="mt-3 text-sm font-medium text-gray-500">
                    No vendors expiring in the next 30 days
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Vendor
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Compliance Type
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Expiration Date
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Days Remaining
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.expiringVendors.map((vendor) => (
                        <ExpiringVendorRow key={vendor.id} vendor={vendor} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
