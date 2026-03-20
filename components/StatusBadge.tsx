"use client";

import React from "react";

type ComplianceStatus =
  | "compliant"
  | "expiring-soon"
  | "non-compliant"
  | "pending";

interface StatusBadgeProps {
  status: ComplianceStatus;
  className?: string;
}

const statusConfig: Record<
  ComplianceStatus,
  { label: string; classes: string }
> = {
  compliant: {
    label: "Compliant",
    classes: "bg-green-100 text-green-800 border border-green-200",
  },
  "expiring-soon": {
    label: "Expiring Soon",
    classes: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  "non-compliant": {
    label: "Non-Compliant",
    classes: "bg-red-100 text-red-800 border border-red-200",
  },
  pending: {
    label: "Pending",
    classes: "bg-gray-100 text-gray-700 border border-gray-200",
  },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes} ${className}`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
          status === "compliant"
            ? "bg-green-500"
            : status === "expiring-soon"
              ? "bg-yellow-500"
              : status === "non-compliant"
                ? "bg-red-500"
                : "bg-gray-400"
        }`}
      />
      {config.label}
    </span>
  );
}

export default StatusBadge;
