import { Badge } from "@/components/ui/badge";
import { STATUS, STATUS_ORDER } from "@/lib/constants";
import type { CallStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

function isCallStatus(s: string | null | undefined): s is CallStatus {
  return !!s && (STATUS_ORDER as readonly string[]).includes(s);
}

const colorClass: Record<
  (typeof STATUS)[CallStatus]["color"],
  string
> = {
  gray: "border-transparent bg-slate-100 text-slate-800 hover:bg-slate-100/80",
  amber: "border-transparent bg-amber-100 text-amber-900 hover:bg-amber-100/80",
  blue: "border-transparent bg-blue-100 text-blue-900 hover:bg-blue-100/80",
  green: "border-transparent bg-emerald-100 text-emerald-900 hover:bg-emerald-100/80",
  red: "border-transparent bg-red-100 text-red-900 hover:bg-red-100/80",
  purple: "border-transparent bg-purple-100 text-purple-900 hover:bg-purple-100/80",
  slate: "border-transparent bg-slate-200 text-slate-800 hover:bg-slate-200/80",
  orange: "border-transparent bg-orange-100 text-orange-900 hover:bg-orange-100/80",
};

export function StatusBadge({ status }: { status: CallStatus | null | undefined }) {
  const key: CallStatus = isCallStatus(status) ? status : "listo_contactar";
  const cfg = STATUS[key];
  return (
    <Badge variant="secondary" className={cn("font-normal capitalize", colorClass[cfg.color])}>
      {cfg.label}
    </Badge>
  );
}
