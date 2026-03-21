type StatusBadgeProps = {
  status: "compliant" | "non_compliant" | "pending";
};

const statusConfig: Record<
  StatusBadgeProps["status"],
  { label: string; className: string }
> = {
  compliant: {
    label: "Compliant",
    className: "bg-green-100 text-green-800 border border-green-200",
  },
  non_compliant: {
    label: "Non-Compliant",
    className: "bg-red-100 text-red-800 border border-red-200",
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
          status === "compliant"
            ? "bg-green-500"
            : status === "non_compliant"
              ? "bg-red-500"
              : "bg-yellow-500"
        }`}
      />
      {config.label}
    </span>
  );
}
