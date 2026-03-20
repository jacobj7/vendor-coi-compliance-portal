import Link from "next/link";

interface Certificate {
  id: string;
  vendor_name: string;
  vendor_id: string;
  policy_number: string;
  coverage_type: string;
  coverage_amount: number;
  expiration_date: string;
  insurer_name: string;
  status: string;
  created_at: string;
}

async function getPendingCertificates(): Promise<Certificate[]> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const response = await fetch(
      `${baseUrl}/api/certificates?status=pending_review`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch certificates: ${response.statusText}`);
    }

    const data = await response.json();
    return data.certificates || data || [];
  } catch (error) {
    console.error("Error fetching pending certificates:", error);
    return [];
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isExpiringSoon(expirationDate: string): boolean {
  const expDate = new Date(expirationDate);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return expDate <= thirtyDaysFromNow;
}

export default async function CertificatesPage() {
  const certificates = await getPendingCertificates();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Certificate Review Queue
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Review and approve pending insurance certificates from vendors
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                {certificates.length} Pending Review
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        {certificates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              All caught up!
            </h3>
            <p className="text-gray-500">
              There are no certificates pending review at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {certificates.map((certificate) => (
              <div
                key={certificate.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Vendor Name and Status */}
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-xl font-semibold text-gray-900 truncate">
                          {certificate.vendor_name}
                        </h2>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 whitespace-nowrap">
                          Pending Review
                        </span>
                        {isExpiringSoon(certificate.expiration_date) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap">
                            Expiring Soon
                          </span>
                        )}
                      </div>

                      {/* Coverage Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Coverage Type
                          </p>
                          <p className="mt-1 text-sm text-gray-900 font-medium">
                            {certificate.coverage_type}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Coverage Amount
                          </p>
                          <p className="mt-1 text-sm text-gray-900 font-medium">
                            {certificate.coverage_amount
                              ? formatCurrency(certificate.coverage_amount)
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Expiration Date
                          </p>
                          <p
                            className={`mt-1 text-sm font-medium ${
                              isExpiringSoon(certificate.expiration_date)
                                ? "text-red-600"
                                : "text-gray-900"
                            }`}
                          >
                            {formatDate(certificate.expiration_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Insurer
                          </p>
                          <p className="mt-1 text-sm text-gray-900 font-medium">
                            {certificate.insurer_name || "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* Policy Number and Submitted Date */}
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        {certificate.policy_number && (
                          <span>
                            <span className="font-medium">Policy #:</span>{" "}
                            {certificate.policy_number}
                          </span>
                        )}
                        {certificate.created_at && (
                          <span>
                            <span className="font-medium">Submitted:</span>{" "}
                            {formatDate(certificate.created_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Review Button */}
                    <div className="ml-6 flex-shrink-0">
                      <Link
                        href={`/certificates/${certificate.id}/review`}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                      >
                        Review
                        <svg
                          className="ml-2 -mr-1 w-4 h-4"
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
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Summary */}
        {certificates.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {certificates.length} certificate
            {certificates.length !== 1 ? "s" : ""} pending review
          </div>
        )}
      </div>
    </div>
  );
}
