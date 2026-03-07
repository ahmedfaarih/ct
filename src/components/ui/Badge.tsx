type UrgencyLevel = "Low" | "Medium" | "High" | "Critical";
type RoleLevel = "requestor" | "reviewer" | "admin";
type BadgeVariant = UrgencyLevel | RoleLevel | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const VARIANTS: Record<string, string> = {
  // Urgency — monochrome, expressed through weight and fill
  Low: "border border-neutral-200 text-neutral-400 font-normal",
  Medium: "border border-neutral-300 text-neutral-600 font-medium",
  High: "border border-neutral-500 text-neutral-700 font-semibold",
  Critical: "bg-neutral-900 text-white font-semibold",

  // Roles
  admin: "bg-neutral-900 text-white",
  reviewer: "border border-neutral-400 text-neutral-600",
  requestor: "border border-neutral-300 text-neutral-500",

  // Generic
  default: "border border-neutral-200 text-neutral-500",
};

export default function Badge({ variant = "default", className = "", children }: BadgeProps) {
  const styles = VARIANTS[variant] ?? VARIANTS.default;

  return (
    <span
      className={`inline-flex items-center text-xs font-mono px-2 py-0.5 rounded ${styles} ${className}`}
    >
      {children}
    </span>
  );
}
