import StatusBadge from "./StatusBadge";
import { formatDate } from "../utils/formatDate";

const PickupCard = ({ pickup, action }) => (
  <div className="content-card h-100">
    <div className="d-flex justify-content-between align-items-start gap-3">
      <div>
        <h3 className="h6 mb-1">{pickup.location_name || "Pickup request"}</h3>
        <p className="text-muted mb-2">{pickup.district} · {pickup.waste_type}</p>
      </div>
      <StatusBadge status={pickup.status || pickup.assignment_status} />
    </div>
    <p className="mb-2">{pickup.description || "No description provided."}</p>
    <div className="small text-muted">Urgency: {pickup.urgency}</div>
    <div className="small text-muted">Requested: {formatDate(pickup.requested_at || pickup.created_at)}</div>
    {action && <div className="mt-3">{action}</div>}
  </div>
);

export default PickupCard;
