import { useEffect, useState } from "react";
import AlertMessage from "../../components/AlertMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import { pickupRescheduleService } from "../../services/pickupRescheduleService";

const getKampalaDateTime = () => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Kampala", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
};

const formatDateTime = (value) => value ? String(value).replace("T", " ") : "Not scheduled";
const statusClass = { pending: "text-bg-warning", approved: "text-bg-success", rejected: "text-bg-danger" };

const ReschedulePickup = () => {
  const [pickups, setPickups] = useState([]);
  const [requests, setRequests] = useState([]);
  const [pickupId, setPickupId] = useState("");
  const [requestedFor, setRequestedFor] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [pickupResponse, requestResponse] = await Promise.all([
        pickupRescheduleService.eligiblePickups(),
        pickupRescheduleService.myRequests()
      ]);
      setPickups(pickupResponse.data);
      setRequests(requestResponse.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load reschedule information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const selectedPickup = pickups.find((pickup) => String(pickup.id) === String(pickupId));

  const submitRequest = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await pickupRescheduleService.create({
        pickup_request_id: pickupId,
        requested_for: requestedFor,
        reason
      });
      setSuccess("Reschedule request sent to the pickup manager.");
      setPickupId("");
      setRequestedFor("");
      setReason("");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not submit reschedule request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h1 className="h3">Reschedule a Pickup</h1>
      <p className="text-muted">Choose one of your assigned pickups and request a new date and time. The manager must approve the change.</p>
      <AlertMessage type="danger" message={error} />
      <AlertMessage type="success" message={success} />

      <div className="content-card mb-4">
        <h2 className="h5">New reschedule request</h2>
        {loading ? <LoadingSpinner text="Loading eligible pickups..." /> : pickups.length === 0 ? (
          <p className="mb-0">You have no eligible assigned pickups. A pickup must be assigned and not already have a pending reschedule request.</p>
        ) : (
          <form className="row g-3" onSubmit={submitRequest}>
            <div className="col-12">
              <label className="form-label" htmlFor="reschedule-pickup">Pickup</label>
              <select id="reschedule-pickup" className="form-select" value={pickupId} onChange={(event) => setPickupId(event.target.value)} required>
                <option value="">Select an eligible pickup</option>
                {pickups.map((pickup) => (
                  <option key={pickup.id} value={pickup.id}>
                    #{pickup.id} · {pickup.location_name}, {pickup.district} · {pickup.waste_type}
                  </option>
                ))}
              </select>
              {selectedPickup && <small className="form-text">Currently planned: {formatDateTime(selectedPickup.scheduled_for)}</small>}
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="reschedule-date">New pickup date and time</label>
              <input id="reschedule-date" className="form-control" type="datetime-local" min={getKampalaDateTime()} value={requestedFor} onChange={(event) => setRequestedFor(event.target.value)} required />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="reschedule-reason">Reason (optional)</label>
              <textarea id="reschedule-reason" className="form-control" maxLength={1000} rows="3" value={reason} onChange={(event) => setReason(event.target.value)} />
              <small className="form-text">Up to 1000 characters.</small>
            </div>
            <div className="col-12">
              <button className="btn btn-cleantrack" disabled={saving || !pickupId}>
                {saving ? "Sending..." : "Submit request"}
              </button>
            </div>
          </form>
        )}
      </div>

      <h2 className="h5">My reschedule requests</h2>
      {loading ? <LoadingSpinner text="Loading request status..." /> : requests.length === 0 ? (
        <div className="content-card"><p className="mb-0">You have not requested a pickup reschedule.</p></div>
      ) : (
        <div className="row g-3">
          {requests.map((request) => (
            <div className="col-lg-6" key={request.id}>
              <article className="content-card h-100">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <h3 className="h6">Pickup #{request.pickup_request_id} · {request.location_name}</h3>
                  <span className={`badge ${statusClass[request.status] || "text-bg-secondary"}`}>{request.status}</span>
                </div>
                <p className="mb-1"><strong>Requested:</strong> {formatDateTime(request.requested_for)}</p>
                <p className="mb-1"><strong>Reason:</strong> {request.customer_reason || "Not provided"}</p>
                {request.manager_response && <p className="mb-0"><strong>Manager response:</strong> {request.manager_response}</p>}
              </article>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default ReschedulePickup;
