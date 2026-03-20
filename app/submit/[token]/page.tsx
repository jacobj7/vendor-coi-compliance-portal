"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { z } from "zod";

const coverageSchema = z.object({
  general_liability_limit: z
    .string()
    .min(1, "General liability limit is required")
    .refine(
      (val) =>
        !isNaN(Number(val.replace(/,/g, ""))) &&
        Number(val.replace(/,/g, "")) > 0,
      {
        message: "Must be a valid positive number",
      },
    ),
  workers_comp_limit: z
    .string()
    .min(1, "Workers comp limit is required")
    .refine(
      (val) =>
        !isNaN(Number(val.replace(/,/g, ""))) &&
        Number(val.replace(/,/g, "")) > 0,
      {
        message: "Must be a valid positive number",
      },
    ),
  expiration_date: z
    .string()
    .min(1, "Expiration date is required")
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date > new Date();
    }, "Expiration date must be a future date"),
});

type CoverageFields = z.infer<typeof coverageSchema>;
type FieldErrors = Partial<Record<keyof CoverageFields, string>>;

interface SubmissionRequest {
  vendor_name: string;
  vendor_email: string;
  status: string;
}

type PageState =
  | "loading"
  | "valid"
  | "invalid"
  | "expired"
  | "already_submitted"
  | "success"
  | "error";

export default function COIUploadPage() {
  const params = useParams();
  const token = params?.token as string;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [submissionRequest, setSubmissionRequest] =
    useState<SubmissionRequest | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fields, setFields] = useState<CoverageFields>({
    general_liability_limit: "",
    workers_comp_limit: "",
    expiration_date: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [fileError, setFileError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) {
      setPageState("invalid");
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/submission-requests/${token}`);
        if (res.status === 404) {
          setPageState("invalid");
          return;
        }
        if (!res.ok) {
          setPageState("error");
          setErrorMessage("Failed to validate submission link.");
          return;
        }
        const data = await res.json();
        if (data.status === "expired") {
          setPageState("expired");
          return;
        }
        if (data.status === "completed" || data.status === "submitted") {
          setPageState("already_submitted");
          return;
        }
        setSubmissionRequest(data);
        setPageState("valid");
      } catch {
        setPageState("error");
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    };

    validateToken();
  }, [token]);

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof CoverageFields]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    if (!allowedTypes.includes(file.type)) {
      setFileError("Only PDF, JPG, and PNG files are accepted.");
      setSelectedFile(null);
      return;
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setFileError("File size must be less than 10MB.");
      setSelectedFile(null);
      return;
    }
    setFileError("");
    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    handleFileChange(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const validate = (): boolean => {
    const result = coverageSchema.safeParse(fields);
    if (!result.success) {
      const errors: FieldErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof CoverageFields;
        if (!errors[field]) {
          errors[field] = err.message;
        }
      });
      setFieldErrors(errors);
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasErrors = false;

    if (!selectedFile) {
      setFileError("Please upload a COI document.");
      hasErrors = true;
    }

    if (!validate()) {
      hasErrors = true;
    }

    if (hasErrors) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile!);
      formData.append(
        "general_liability_limit",
        fields.general_liability_limit.replace(/,/g, ""),
      );
      formData.append(
        "workers_comp_limit",
        fields.workers_comp_limit.replace(/,/g, ""),
      );
      formData.append("expiration_date", fields.expiration_date);

      const res = await fetch(`/api/submission-requests/${token}/submit`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error || "Submission failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setPageState("success");
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 text-sm">
            Validating your submission link…
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "invalid") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-7 w-7 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Invalid Link
          </h1>
          <p className="text-gray-500 text-sm">
            This submission link is invalid or does not exist. Please contact
            the person who sent you this link.
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "expired") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
            <svg
              className="h-7 w-7 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Link Expired
          </h1>
          <p className="text-gray-500 text-sm">
            This submission link has expired. Please contact the person who sent
            you this link to request a new one.
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "already_submitted") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-7 w-7 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Already Submitted
          </h1>
          <p className="text-gray-500 text-sm">
            A COI has already been submitted using this link. If you need to
            make changes, please contact the person who sent you this link.
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-7 w-7 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Submission Received!
          </h1>
          <p className="text-gray-500 text-sm">
            Thank you for submitting your Certificate of Insurance. We will
            review it and get back to you if we have any questions.
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-7 w-7 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Something Went Wrong
          </h1>
          <p className="text-gray-500 text-sm">
            {errorMessage ||
              "An unexpected error occurred. Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-600 mb-4">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Certificate of Insurance Upload
          </h1>
          {submissionRequest && (
            <p className="mt-2 text-gray-500 text-sm">
              Submitting on behalf of{" "}
              <span className="font-medium text-gray-700">
                {submissionRequest.vendor_name}
              </span>
            </p>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <form onSubmit={handleSubmit} noValidate>
            {/* File Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                COI Document <span className="text-red-500">*</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  dragOver
                    ? "border-blue-500 bg-blue-50"
                    : fileError
                      ? "border-red-300 bg-red-50"
                      : selectedFile
                        ? "border-green-400 bg-green-50"
                        : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileInputChange}
                  className="sr-only"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <svg
                      className="h-8 w-8 text-green-500 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <svg
                      className="mx-auto h-10 w-10 text-gray-400 mb-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-blue-600">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF, JPG, PNG up to 10MB
                    </p>
                  </>
                )}
              </div>
              {fileError && (
                <p className="mt-1.5 text-xs text-red-600">{fileError}</p>
              )}
              {selectedFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="mt-2 text-xs text-gray-500 hover:text-red-600 underline"
                >
                  Remove file
                </button>
              )}
            </div>

            {/* Coverage Fields */}
            <div className="space-y-5">
              {/* General Liability Limit */}
              <div>
                <label
                  htmlFor="general_liability_limit"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  General Liability Limit ($){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="general_liability_limit"
                  name="general_liability_limit"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 1,000,000"
                  value={fields.general_liability_limit}
                  onChange={handleFieldChange}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    fieldErrors.general_liability_limit
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 bg-white"
                  }`}
                />
                {fieldErrors.general_liability_limit && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.general_liability_limit}
                  </p>
                )}
              </div>

              {/* Workers Comp Limit */}
              <div>
                <label
                  htmlFor="workers_comp_limit"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Workers&apos; Compensation Limit ($){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="workers_comp_limit"
                  name="workers_comp_limit"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 500,000"
                  value={fields.workers_comp_limit}
                  onChange={handleFieldChange}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    fieldErrors.workers_comp_limit
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 bg-white"
                  }`}
                />
                {fieldErrors.workers_comp_limit && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.workers_comp_limit}
                  </p>
                )}
              </div>

              {/* Expiration Date */}
              <div>
                <label
                  htmlFor="expiration_date"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Policy Expiration Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="expiration_date"
                  name="expiration_date"
                  type="date"
                  value={fields.expiration_date}
                  onChange={handleFieldChange}
                  min={new Date().toISOString().split("T")[0]}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    fieldErrors.expiration_date
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 bg-white"
                  }`}
                />
                {fieldErrors.expiration_date && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.expiration_date}
                  </p>
                )}
              </div>
            </div>

            {/* Global Error */}
            {errorMessage && (
              <div className="mt-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-7 w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
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
                  Submitting…
                </span>
              ) : (
                "Submit Certificate of Insurance"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Your information is securely transmitted and will only be used for
          insurance verification purposes.
        </p>
      </div>
    </div>
  );
}
