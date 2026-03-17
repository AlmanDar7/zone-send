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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusMap[status]}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
