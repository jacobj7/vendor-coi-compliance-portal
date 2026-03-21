"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ParsedCOIFields {
  policy_number?: string;
  insured_name?: string;
  insurer_name?: string;
  effective_date?: string;
  expiration_date?: string;
  coverage_types?: string[];
  general_aggregate?: string;
  each_occurrence?: string;
  additional_insured?: boolean;
  certificate_holder?: string;
  raw_text?: string;
}

interface UploadResponse {
  coi_id: string;
  message: string;
}

interface ParseResponse {
  coi_id: string;
  parsed_fields: ParsedCOIFields;
  message: string;
}

type UploadState = "idle" | "uploading" | "parsing" | "success" | "error";

interface SubmitClientProps {
  token: string;
}

export default function SubmitClient({ token }: SubmitClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedFields, setParsedFields] = useState<ParsedCOIFields | null>(
    null,
  );
  const [coiId, setCoiId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== "application/pdf") {
      setErrorMessage("Only PDF files are accepted.");
      setUploadState("error");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage("File size must be under 20MB.");
      setUploadState("error");
      return;
    }
    setSelectedFile(file);
    setErrorMessage("");
    setUploadState("idle");
    setParsedFields(null);
    setCoiId(null);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const simulateProgress = (onComplete: () => void) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 90) {
        progress = 90;
        clearInterval(interval);
        onComplete();
      }
      setUploadProgress(Math.min(Math.round(progress), 90));
    }, 200);
    return interval;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setErrorMessage("Please select a PDF file to upload.");
      return;
    }

    setUploadState("uploading");
    setUploadProgress(0);
    setErrorMessage("");

    let progressInterval: ReturnType<typeof setInterval> | null = null;

    try {
      progressInterval = simulateProgress(() => {});

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("token", token);

      const uploadResponse = await fetch("/api/coi/upload", {
        method: "POST",
        body: formData,
      });

      if (progressInterval) clearInterval(progressInterval);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse
          .json()
          .catch(() => ({ message: "Upload failed." }));
        throw new Error(
          errorData.message ||
            `Upload failed with status ${uploadResponse.status}`,
        );
      }

      setUploadProgress(100);

      const uploadData: UploadResponse = await uploadResponse.json();
      setCoiId(uploadData.coi_id);

      setUploadState("parsing");
      setUploadProgress(0);

      progressInterval = simulateProgress(() => {});

      const parseResponse = await fetch("/api/coi/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coi_id: uploadData.coi_id }),
      });

      if (progressInterval) clearInterval(progressInterval);

      if (!parseResponse.ok) {
        const errorData = await parseResponse
          .json()
          .catch(() => ({ message: "Parsing failed." }));
        throw new Error(
          errorData.message ||
            `Parsing failed with status ${parseResponse.status}`,
        );
      }

      setUploadProgress(100);

      const parseData: ParseResponse = await parseResponse.json();
      setParsedFields(parseData.parsed_fields);
      setUploadState("success");
    } catch (err) {
      if (progressInterval) clearInterval(progressInterval);
      setUploadState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    }
  };

  const handleReset = () => {
    setUploadState("idle");
    setSelectedFile(null);
    setParsedFields(null);
    setCoiId(null);
    setErrorMessage("");
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatCurrency = (value?: string) => {
    if (!value) return "N/A";
    return value;
  };

  const formatDate = (value?: string) => {
    if (!value) return "N/A";
    try {
      return new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return value;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">
              Certificate of Insurance Upload
            </h1>
            <p className="text-blue-100 mt-1 text-sm">
              Upload your COI document for verification and processing
            </p>
          </div>

          <div className="px-8 py-6">
            {/* Success State */}
            {uploadState === "success" && parsedFields && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-green-600"
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
                  <div>
                    <p className="font-semibold text-green-800">
                      Successfully processed!
                    </p>
                    <p className="text-green-600 text-sm">
                      Your COI has been uploaded and parsed.
                    </p>
                  </div>
                </div>

                {/* Parsed Fields Preview */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    Extracted Information
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldCard
                      label="Policy Number"
                      value={parsedFields.policy_number || "N/A"}
                    />
                    <FieldCard
                      label="Insured Name"
                      value={parsedFields.insured_name || "N/A"}
                    />
                    <FieldCard
                      label="Insurer"
                      value={parsedFields.insurer_name || "N/A"}
                    />
                    <FieldCard
                      label="Additional Insured"
                      value={
                        parsedFields.additional_insured === true
                          ? "Yes"
                          : parsedFields.additional_insured === false
                            ? "No"
                            : "N/A"
                      }
                    />
                    <FieldCard
                      label="Effective Date"
                      value={formatDate(parsedFields.effective_date)}
                    />
                    <FieldCard
                      label="Expiration Date"
                      value={formatDate(parsedFields.expiration_date)}
                    />
                    <FieldCard
                      label="General Aggregate"
                      value={formatCurrency(parsedFields.general_aggregate)}
                    />
                    <FieldCard
                      label="Each Occurrence"
                      value={formatCurrency(parsedFields.each_occurrence)}
                    />
                    {parsedFields.certificate_holder && (
                      <div className="sm:col-span-2">
                        <FieldCard
                          label="Certificate Holder"
                          value={parsedFields.certificate_holder}
                        />
                      </div>
                    )}
                    {parsedFields.coverage_types &&
                      parsedFields.coverage_types.length > 0 && (
                        <div className="sm:col-span-2">
                          <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                              Coverage Types
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {parsedFields.coverage_types.map((type, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                                >
                                  {type}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {coiId && (
                  <p className="text-xs text-gray-400 text-center">
                    Reference ID: {coiId}
                  </p>
                )}

                <button
                  onClick={handleReset}
                  className="w-full py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Upload Another Document
                </button>
              </div>
            )}

            {/* Upload / Parsing State */}
            {(uploadState === "uploading" || uploadState === "parsing") && (
              <div className="space-y-6 py-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                    <svg
                      className="w-8 h-8 text-blue-600 animate-spin"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {uploadState === "uploading"
                      ? "Uploading your document..."
                      : "Analyzing document with AI..."}
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    {uploadState === "uploading"
                      ? "Please wait while we securely upload your file."
                      : "Extracting insurance details from your COI."}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>
                      {uploadState === "uploading" ? "Uploading" : "Parsing"}
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <ProgressStep label="File validation" done={true} />
                  <ProgressStep
                    label="Secure upload"
                    done={uploadState === "parsing" || uploadProgress === 100}
                    active={uploadState === "uploading"}
                  />
                  <ProgressStep
                    label="AI document analysis"
                    done={false}
                    active={uploadState === "parsing"}
                  />
                </div>
              </div>
            )}

            {/* Idle / Error State — Show Form */}
            {(uploadState === "idle" || uploadState === "error") && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                    ${
                      isDragging
                        ? "border-blue-500 bg-blue-50"
                        : selectedFile
                          ? "border-green-400 bg-green-50"
                          : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
                    }
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                    aria-label="Upload PDF file"
                  />

                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                        <svg
                          className="w-6 h-6 text-green-600"
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
                      <p className="font-medium text-gray-800">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · PDF
                      </p>
                      <p className="text-xs text-blue-600">
                        Click to change file
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-200 rounded-full">
                        <svg
                          className="w-6 h-6 text-gray-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">
                          {isDragging
                            ? "Drop your PDF here"
                            : "Drag & drop your PDF here"}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          or click to browse files
                        </p>
                      </div>
                      <p className="text-xs text-gray-400">
                        PDF only · Max 20MB
                      </p>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {uploadState === "error" && errorMessage && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                      <svg
                        className="w-5 h-5 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-red-800 text-sm">
                        Upload failed
                      </p>
                      <p className="text-red-600 text-sm mt-0.5">
                        {errorMessage}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!selectedFile}
                  className={`
                    w-full py-3.5 px-6 rounded-xl font-semibold text-white transition-all
                    ${
                      selectedFile
                        ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm hover:shadow-md"
                        : "bg-gray-300 cursor-not-allowed"
                    }
                  `}
                >
                  Upload & Process COI
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Your document is encrypted in transit and stored securely.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm font-medium text-gray-800 break-words">{value}</p>
    </div>
  );
}

function ProgressStep({
  label,
  done,
  active,
}: {
  label: string;
  done: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`
          flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center
          ${done ? "bg-green-500" : active ? "bg-blue-500" : "bg-gray-200"}
        `}
      >
        {done ? (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : active ? (
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        ) : (
          <div className="w-2 h-2 bg-gray-400 rounded-full" />
        )}
      </div>
      <span
        className={`text-sm ${done ? "text-green-700 font-medium" : active ? "text-blue-700 font-medium" : "text-gray-400"}`}
      >
        {label}
      </span>
    </div>
  );
}
