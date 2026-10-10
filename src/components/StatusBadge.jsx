const labels = {
  pending: "Pending",
  assigned: "Assigned",
  on_the_way: "On the way",
  collected: "Collected",
  failed: "Failed",
  cancelled: "Cancelled"
};

const StatusBadge = ({ status }) => {
  const normalized = status || "pending";
  return <span className={`status-badge status-${normalized}`}>{labels[normalized] || normalized}</span>;
};

export default StatusBadge;
