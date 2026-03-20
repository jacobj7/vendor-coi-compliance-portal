"use client";

import { useState } from "react";
import { format } from "date-fns";

interface ExtractedField {
  key: string;
  value: string;
}

interface Submission {
  id: string;
  status: "pending" | "approved" | "rejected" | "under_review";
  extractedFields: ExtractedField[];
  reviewNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  documentName: string;
}

interface Vendor {
  id: string;
  name: string;
  email: string;
  complianceStatus: "compliant" | "non_compliant" | "pending" | "expired";
  inviteToken: string;
  createdAt: string;
  updatedAt: string;
  submissions: Submission[];
}

interface VendorDetailClientProps {
  vendor: Vendor;
  baseUrl: string;
}

const statusColors: Record<string, string> = {
  compliant: "bg-green-100 text-green-800 border-green-200",
  non_compliant: "bg-red-100 text-red-800 border-red-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  expired: "bg-gray-100 text-gray-800 border-gray-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  under_review: "bg-blue-100 text-blue-800 border-blue-200",
};

const statusLabels: Record<string, string> = {
  compliant: "Compliant",
  non_compliant: "Non-Compliant",
  pending: "Pending",
  expired: "Expired",
  approved: "Approved",
  rejected: "Rejected",
  under_review: "Under Review",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        statusColors[status] ?? "bg-gray-100 text-gray-800 border-gray-200"
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "—";
  try {
    return format(new Date(isoString), "MMM d, yyyy HH:mm:ss");
  } catch {
    return isoString;
  }
}

export default function VendorDetailClient({
  vendor,
  baseUrl,
}: VendorDetailClientProps) {
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(
    null,
  );

  const inviteLink = `${baseUrl}/vendor/submit/${vendor.inviteToken}`;

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = inviteLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  const toggleSubmission = (id: string) => {
    setExpandedSubmission((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/dashboard/vendors"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Vendors
          </a>
          <h1 className="text-3xl font-bold text-gray-900">{vendor.name}</h1>
          <p className="text-gray-500 mt-1">{vendor.email}</p>
        </div>

        {/* Vendor Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Compliance Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Compliance Status
            </h2>
            <div className="flex items-center gap-3">
              <StatusBadge status={vendor.complianceStatus} />
            </div>
            <div className="mt-4 space-y-1 text-xs text-gray-400">
              <p>
                <span className="font-medium text-gray-500">Created:</span>{" "}
                {formatDate(vendor.createdAt)}
              </p>
              <p>
                <span className="font-medium text-gray-500">Updated:</span>{" "}
                {formatDate(vendor.updatedAt)}
              </p>
            </div>
          </div>

          {/* Submissions Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Submissions
            </h2>
            <p className="text-3xl font-bold text-gray-900">
              {vendor.submissions.length}
            </p>
            <div className="mt-3 space-y-1 text-xs text-gray-500">
              <p>
                Approved:{" "}
                <span className="font-semibold text-green-600">
                  {
                    vendor.submissions.filter((s) => s.status === "approved")
                      .length
                  }
                </span>
              </p>
              <p>
                Rejected:{" "}
                <span className="font-semibold text-red-600">
                  {
                    vendor.submissions.filter((s) => s.status === "rejected")
                      .length
                  }
                </span>
              </p>
              <p>
                Pending:{" "}
                <span className="font-semibold text-yellow-600">
                  {
                    vendor.submissions.filter((s) => s.status === "pending")
                      .length
                  }
                </span>
              </p>
              <p>
                Under Review:{" "}
                <span className="font-semibold text-blue-600">
                  {
                    vendor.submissions.filter(
                      (s) => s.status === "under_review",
                    ).length
                  }
                </span>
              </p>
            </div>
          </div>

          {/* Invite Link */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Invite Link
            </h2>
            <div className="flex flex-col gap-2">
              <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                <p className="text-xs text-gray-600 break-all font-mono leading-relaxed">
                  {inviteLink}
                </p>
              </div>
              <button
                onClick={handleCopyInvite}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  copiedInvite
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800"
                }`}
              >
                {copiedInvite ? (
                  <>
                    <svg
                      className="w-4 h-4"
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
                    Copied!
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Submission History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Submission History
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              All document submissions from this vendor
            </p>
          </div>

          {vendor.submissions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-3 text-sm text-gray-500">No submissions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reviewed At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Review Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vendor.submissions.map((submission) => (
                    <>
                      <tr
                        key={submission.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4 text-gray-400 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <span className="text-sm font-medium text-gray-900 max-w-xs truncate">
                              {submission.documentName}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 pl-6 font-mono">
                            {submission.id}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={submission.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 font-mono">
                            {submission.submittedAt}
                          </span>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(submission.submittedAt)}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {submission.reviewedAt ? (
                            <>
                              <span className="text-sm text-gray-600 font-mono">
                                {submission.reviewedAt}
                              </span>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {formatDate(submission.reviewedAt)}
                              </p>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {submission.reviewNotes ? (
                            <p
                              className="text-sm text-gray-600 max-w-xs truncate"
                              title={submission.reviewNotes}
                            >
                              {submission.reviewNotes}
                            </p>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleSubmission(submission.id)}
                            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                          >
                            {expandedSubmission === submission.id ? (
                              <>
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 15l7-7 7 7"
                                  />
                                </svg>
                                Hide
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                                Show ({submission.extractedFields.length})
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                      {expandedSubmission === submission.id && (
                        <tr
                          key={`${submission.id}-expanded`}
                          className="bg-indigo-50"
                        >
                          <td colSpan={6} className="px-6 py-4">
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-gray-700">
                                Extracted Fields
                              </h4>
                              {submission.extractedFields.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">
                                  No extracted fields available
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {submission.extractedFields.map(
                                    (field, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-white rounded-lg border border-indigo-100 p-3 shadow-sm"
                                      >
                                        <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">
                                          {field.key}
                                        </p>
                                        <p className="text-sm text-gray-800 break-words">
                                          {field.value || (
                                            <span className="text-gray-400 italic">
                                              empty
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}
                              {submission.reviewNotes && (
                                <div className="mt-3 bg-white rounded-lg border border-indigo-100 p-3">
                                  <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">
                                    Full Review Notes
                                  </p>
                                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                    {submission.reviewNotes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
