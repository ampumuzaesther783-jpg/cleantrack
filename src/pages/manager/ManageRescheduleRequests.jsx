import { useEffect, useState } from "react";
import AlertMessage from "../../components/AlertMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import { pickupRescheduleService } from "../../services/pickupRescheduleService";

const formatDateTime = (value) => value ? String(value).replace("T", " ") : "Not scheduled";

const ManageRescheduleRequests = () => {
  const [requests, setRequests] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await pickupRescheduleService.managerPending();
      setRequests(result.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load pending reschedule requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const decide = async (request, status) => {
    setBusyId(request.id);
    setError("");
    setSuccess("");
    try {
      await pickupRescheduleService.decide(request.id, status, responses[request.id] || "");
      setSuccess(`Reschedule request for pickup #${request.pickup_request_id} ${status}.`);
      await loadRequests();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not process reschedule request");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <h1 className="h3">Pickup Reschedule Requests</h1>
      <p className="text-muted">Review requests for pickups assigned to your company.</p>
      <AlertMessage type="danger" message={error} />
      <AlertMessage type="success" message={success} />
      {loading ? <LoadingSpinner text="Loading reschedule requests..." /> : requests.length === 0 ? (
        <div className="content-card"><p className="mb-0">There are no pending reschedule requests for your company.</p></div>
      ) : (
        <div className="row g-3">
          {requests.map((request) => (
            <div className="col-xl-6" key={request.id}>
              <article className="content-card h-100">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <h2 className="h5 mb-1">Pickup #{request.pickup_request_id} · {request.location_name}</h2>
                    <p className="text-muted">{request.customer_name} · {request.district} · {request.waste_type}</p>
                  </div>
                  <span className="badge text-bg-warning">Pending</span>
                </div>
                <dl className="row">
                  <dt className="col-5">Company</dt><dd className="col-7">{request.company_name}</dd>
                  <dt className="col-5">Current pickup</dt><dd className="col-7">{formatDateTime(request.scheduled_for)}</dd>
                  <dt className="col-5">Requested pickup</dt><dd className="col-7">{formatDateTime(request.requested_for)}</dd>
                  <dt className="col-5">Customer reason</dt><dd className="col-7">{request.customer_reason || "Not provided"}</dd>
                  <dt className="col-5">Pickup status</dt><dd className="col-7">{request.pickup_status}</dd>
                </dl>
                <label className="form-label" htmlFor={`response-${request.id}`}>Response or rejection reason (optional)</label>
                <textarea
                  id={`response-${request.id}`}
                  className="form-control mb-3"
                  rows="2"
                  maxLength={1000}
                  value={responses[request.id] || ""}
                  onChange={(event) => setResponses({ ...responses, [request.id]: event.target.value })}
                />
                <div className="d-flex gap-2">
                  <button className="btn btn-cleantrack btn-sm" disabled={busyId === request.id} onClick={() => decide(request, "approved")}>
                    {busyId === request.id ? "Saving..." : "Approve"}
                  </button>
                  <button className="btn btn-outline-danger btn-sm" disabled={busyId === request.id} onClick={() => decide(request, "rejected")}>
                    Reject
                  </button>
                </div>
              </article>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default ManageRescheduleRequests;
