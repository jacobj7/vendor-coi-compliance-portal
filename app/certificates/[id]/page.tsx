"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Certificate {
  id: string;
  title: string;
  recipient_name: string;
  recipient_email: string;
  issuer_name: string;
  issuer_email: string;
  course_name: string;
  course_description: string;
  issue_date: string;
  expiry_date: string | null;
  status: string;
  certificate_number: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export default function CertificateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchCertificate();
  }, [id]);

  async function fetchCertificate() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/certificates/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to fetch certificate (${res.status})`,
        );
      }
      const data = await res.json();
      setCertificate(data.certificate || data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load certificate",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(action: "approve" | "reject") {
    if (!certificate) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch(`/api/certificates/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Review failed (${res.status})`);
      }

      setSubmitSuccess(
        `Certificate successfully ${action === "approve" ? "approved" : "rejected"}.`,
      );
      setNotes("");
      await fetchCertificate();
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Review action failed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      revoked: "bg-gray-100 text-gray-800 border-gray-200",
    };
    const style = styles[status] || "bg-blue-100 text-blue-800 border-blue-200";
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${style}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Certificate
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchCertificate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Certificate not found.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isPending = certificate.status === "pending";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg
              className="w-5 h-5"
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
            Back
          </button>
          <div className="flex items-center gap-3">
            {getStatusBadge(certificate.status)}
          </div>
        </div>

        {/* Certificate Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* Certificate Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-blue-200 text-sm font-medium uppercase tracking-wide mb-1">
                  Certificate
                </p>
                <h1 className="text-2xl font-bold mb-1">{certificate.title}</h1>
                <p className="text-blue-200 text-sm">
                  #{certificate.certificate_number}
                </p>
              </div>
              <div className="text-right">
                <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">
                  Issued
                </p>
                <p className="text-white font-medium">
                  {formatDate(certificate.issue_date)}
                </p>
              </div>
            </div>
          </div>

          {/* Certificate Fields */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Recipient Section */}
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                  Recipient
                </h2>
                <div className="space-y-3">
                  <Field label="Name" value={certificate.recipient_name} />
                  <Field label="Email" value={certificate.recipient_email} />
                </div>
              </div>

              {/* Issuer Section */}
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                  Issuer
                </h2>
                <div className="space-y-3">
                  <Field label="Name" value={certificate.issuer_name} />
                  <Field label="Email" value={certificate.issuer_email} />
                </div>
              </div>

              {/* Course Section */}
              <div className="md:col-span-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                  Course
                </h2>
                <div className="space-y-3">
                  <Field label="Course Name" value={certificate.course_name} />
                  {certificate.course_description && (
                    <Field
                      label="Description"
                      value={certificate.course_description}
                    />
                  )}
                </div>
              </div>

              {/* Dates Section */}
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                  Dates
                </h2>
                <div className="space-y-3">
                  <Field
                    label="Issue Date"
                    value={formatDate(certificate.issue_date)}
                  />
                  <Field
                    label="Expiry Date"
                    value={
                      certificate.expiry_date
                        ? formatDate(certificate.expiry_date)
                        : "No expiry"
                    }
                  />
                  <Field
                    label="Created At"
                    value={formatDate(certificate.created_at)}
                  />
                  <Field
                    label="Updated At"
                    value={formatDate(certificate.updated_at)}
                  />
                </div>
              </div>

              {/* Review Section */}
              {(certificate.reviewed_by ||
                certificate.reviewed_at ||
                certificate.review_notes) && (
                <div>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                    Review
                  </h2>
                  <div className="space-y-3">
                    {certificate.reviewed_by && (
                      <Field
                        label="Reviewed By"
                        value={certificate.reviewed_by}
                      />
                    )}
                    {certificate.reviewed_at && (
                      <Field
                        label="Reviewed At"
                        value={formatDate(certificate.reviewed_at)}
                      />
                    )}
                    {certificate.review_notes && (
                      <Field
                        label="Review Notes"
                        value={certificate.review_notes}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Metadata Section */}
              {certificate.metadata &&
                Object.keys(certificate.metadata).length > 0 && (
                  <div className="md:col-span-2">
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                      Additional Metadata
                    </h2>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                        {JSON.stringify(certificate.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Review Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Review Certificate
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {isPending
              ? "This certificate is pending review. Add notes and approve or reject it."
              : `This certificate has already been ${certificate.status}. You can still update the review.`}
          </p>

          {submitSuccess && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <svg
                className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-green-700 text-sm">{submitSuccess}</p>
            </div>
          )}

          {submitError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-red-700 text-sm">{submitError}</p>
            </div>
          )}

          <div className="mb-6">
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Review Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add any notes about this review decision..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors"
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleReview("approve")}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg
                  className="w-5 h-5"
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
              )}
              Approve Certificate
            </button>
            <button
              onClick={() => handleReview("reject")}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              Reject Certificate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900 break-words">{value || "—"}</dd>
    </div>
  );
}
