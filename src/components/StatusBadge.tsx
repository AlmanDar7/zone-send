interface StatusBadgeProps {
  status: "Active" | "Replied" | "Bounced" | "Unsubscribed" | "Completed";
}

const statusMap: Record<string, string> = {
  Active: "status-active",
  Replied: "status-replied",
  Bounced: "status-bounced",
  Unsubscribed: "status-unsubscribed",
  Completed: "status-completed",
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${statusMap[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
};

export default StatusBadge;
