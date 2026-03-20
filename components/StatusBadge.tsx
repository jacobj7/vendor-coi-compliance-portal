import React from "react";

type ComplianceStatus =
  | "compliant"
  | "non_compliant"
  | "pending"
  | "under_review"
  | "exempt"
  | "unknown"
  | string;

interface StatusBadgeProps {
  status: ComplianceStatus;
  className?: string;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  compliant: {
    label: "Compliant",
    classes: "bg-green-100 text-green-800 border border-green-200",
  },
  non_compliant: {
    label: "Non-Compliant",
    classes: "bg-red-100 text-red-800 border border-red-200",
  },
  pending: {
    label: "Pending",
    classes: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  under_review: {
    label: "Under Review",
    classes: "bg-blue-100 text-blue-800 border border-blue-200",
  },
  exempt: {
    label: "Exempt",
    classes: "bg-purple-100 text-purple-800 border border-purple-200",
  },
  unknown: {
    label: "Unknown",
    classes: "bg-gray-100 text-gray-800 border border-gray-200",
  },
};

const defaultConfig = {
  label: "Unknown",
  classes: "bg-gray-100 text-gray-800 border border-gray-200",
};

function formatLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase?.() ?? "unknown";
  const config = statusConfig[normalizedStatus] ?? {
    label: formatLabel(normalizedStatus),
    classes: defaultConfig.classes,
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes} ${className}`}
      aria-label={`Status: ${config.label}`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${getIndicatorColor(normalizedStatus)}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

function getIndicatorColor(status: string): string {
  const indicatorColors: Record<string, string> = {
    compliant: "bg-green-500",
    non_compliant: "bg-red-500",
    pending: "bg-yellow-500",
    under_review: "bg-blue-500",
    exempt: "bg-purple-500",
    unknown: "bg-gray-500",
  };
  return indicatorColors[status] ?? "bg-gray-500";
}

export default StatusBadge;
