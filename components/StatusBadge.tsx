import React from "react";

type Status =
  | "compliant"
  | "expiring_soon"
  | "expired"
  | "pending_review"
  | "rejected";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<Status, { label: string; classes: string }> = {
  compliant: {
    label: "Compliant",
    classes: "bg-green-100 text-green-800 border-green-200",
  },
  expiring_soon: {
    label: "Expiring Soon",
    classes: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  expired: {
    label: "Expired",
    classes: "bg-red-100 text-red-800 border-red-200",
  },
  pending_review: {
    label: "Pending Review",
    classes: "bg-blue-100 text-blue-800 border-blue-200",
  },
  rejected: {
    label: "Rejected",
    classes: "bg-gray-100 text-gray-800 border-gray-200",
  },
};

const defaultConfig = {
  label: "Unknown",
  classes: "bg-gray-100 text-gray-600 border-gray-200",
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, "_") as Status;
  const config = statusConfig[normalizedStatus] ?? defaultConfig;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          normalizedStatus === "compliant"
            ? "bg-green-500"
            : normalizedStatus === "expiring_soon"
              ? "bg-yellow-500"
              : normalizedStatus === "expired"
                ? "bg-red-500"
                : normalizedStatus === "pending_review"
                  ? "bg-blue-500"
                  : normalizedStatus === "rejected"
                    ? "bg-gray-500"
                    : "bg-gray-400"
        }`}
      />
      {config.label}
    </span>
  );
}

export default StatusBadge;
