import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AlertMessage from "../../components/AlertMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import { feedbackService } from "../../services/feedbackService";
import { pickupService } from "../../services/pickupService";
import { formatDate } from "../../utils/formatDate";

const PickupDetails = () => {
  const { id } = useParams();
  const [pickup, setPickup] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [feedback, setFeedback] = useState({ rating: 5, comment: "" });

  const loadPickup = async () => {
    setLoading(true); setError("");
    try {
      const loadedPickup = (await pickupService.getById(id)).data;
      setPickup(loadedPickup);
      if (loadedPickup.status === "collected") {
        const feedbackResponse = await feedbackService.byPickup(id);
        setExistingFeedback(feedbackResponse.data[0] || null);
        setFeedbackSubmitted(feedbackResponse.data.length > 0);
      } else {
        setExistingFeedback(null);
        setFeedbackSubmitted(false);
      }
    }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not load pickup details."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadPickup();
  }, [id]);

  const cancelPickup = async () => {
    if (!window.confirm("Cancel this pending pickup request?")) return;
    setSaving(true); setError("");
    try { await pickupService.cancel(id); setMessage("Pickup request cancelled."); await loadPickup(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not cancel pickup request."); }
    finally { setSaving(false); }
  };

  const submitFeedback = async (event) => {
    event.preventDefault();
    setSaving(true); setError("");
    try { await feedbackService.create({ pickup_request_id: id, ...feedback }); setMessage("Feedback saved. Thank you."); setFeedbackSubmitted(true); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not save feedback."); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (!pickup) return <AlertMessage type="danger" message={error || "Pickup not found."} />;

  return (
    <div className="content-card">
      <div className="d-flex justify-content-between align-items-start gap-3">
        <div>
          <h1 className="h3">{pickup.location_name}</h1>
          <p className="text-muted">{pickup.district} · {pickup.waste_type}</p>
        </div>
        <StatusBadge status={pickup.status} />
      </div>
      <AlertMessage type="success" message={message} />
      <AlertMessage type="danger" message={error} />
      <p>{pickup.description || "No description provided."}</p>
      <dl className="row">
        <dt className="col-sm-4">Urgency</dt><dd className="col-sm-8">{pickup.urgency}</dd>
        <dt className="col-sm-4">Bin level</dt><dd className="col-sm-8">{pickup.estimated_bin_level}%</dd>
        <dt className="col-sm-4">Requested</dt><dd className="col-sm-8">{formatDate(pickup.requested_at)}</dd>
        <dt className="col-sm-4">Address</dt><dd className="col-sm-8">{pickup.address_details || "Not provided"}</dd>
      </dl>
      {pickup.status === "pending" && <button className="btn btn-outline-danger" disabled={saving} onClick={cancelPickup}>{saving ? "Cancelling..." : "Cancel Request"}</button>}
      {pickup.status === "collected" && !feedbackSubmitted && (
        <form className="mt-4 border-top pt-3" onSubmit={submitFeedback}>
          <h2 className="h5">Rate this pickup</h2>
          <div className="row g-2">
            <div className="col-md-3">
              <select className="form-select" value={feedback.rating} onChange={(event) => setFeedback({ ...feedback, rating: event.target.value })}>
                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div className="col-md-7">
              <input className="form-control" maxLength={1000} placeholder="Comment" value={feedback.comment} onChange={(event) => setFeedback({ ...feedback, comment: event.target.value })} />
            </div>
            <div className="col-md-2">
              <button className="btn btn-cleantrack w-100" disabled={saving}>{saving ? "Sending..." : "Send"}</button>
            </div>
          </div>
        </form>
      )}
      {feedbackSubmitted && <p className="mt-4 mb-0 text-success">Feedback has already been submitted for this pickup{existingFeedback ? ` (${existingFeedback.rating}/5).` : "."}</p>}
    </div>
  );
};

export default PickupDetails;
