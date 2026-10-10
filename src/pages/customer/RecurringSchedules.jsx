import { useEffect, useState } from "react";
import AlertMessage from "../../components/AlertMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import { categoryService } from "../../services/categoryService";
import { locationService } from "../../services/locationService";
import { recurringScheduleService } from "../../services/recurringScheduleService";

const weekdays = [
  [1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"],
  [5, "Friday"], [6, "Saturday"], [7, "Sunday"]
];

const getLocalDate = () => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Kampala", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const initialForm = () => ({
  location_id: "",
  waste_category_id: "",
  frequency: "weekly",
  preferred_day: "1",
  preferred_time: "09:00",
  start_date: getLocalDate()
});

const formatDate = (value) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString() : "—";

const RecurringSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [scheduleResponse, locationResponse, categoryResponse] = await Promise.all([
        recurringScheduleService.mySchedules(),
        locationService.myLocations(),
        categoryService.list()
      ]);
      setSchedules(scheduleResponse.data);
      setLocations(locationResponse.data);
      setCategories(categoryResponse.data.filter((category) => category.status === "active"));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not load recurring schedules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const resetForm = () => {
    setForm(initialForm());
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      if (editingId) {
        await recurringScheduleService.update(editingId, form);
        setSuccess("Recurring schedule updated.");
      } else {
        await recurringScheduleService.create(form);
        setSuccess("Recurring schedule created.");
      }
      resetForm();
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save recurring schedule");
    } finally {
      setSaving(false);
    }
  };

  const editSchedule = (schedule) => {
    setError("");
    setSuccess("");
    setEditingId(schedule.id);
    setForm({
      location_id: String(schedule.location_id),
      waste_category_id: String(schedule.waste_category_id),
      frequency: schedule.frequency,
      preferred_day: String(schedule.preferred_day),
      preferred_time: schedule.preferred_time.slice(0, 5),
      start_date: schedule.start_date.slice(0, 10)
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeStatus = async (schedule) => {
    setBusyId(schedule.id);
    setError("");
    setSuccess("");
    try {
      const status = schedule.status === "active" ? "inactive" : "active";
      await recurringScheduleService.updateStatus(schedule.id, status);
      setSuccess(`Schedule ${status === "active" ? "activated" : "deactivated"}.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not update schedule status");
    } finally {
      setBusyId(null);
    }
  };

  const deleteSchedule = async (schedule) => {
    if (!window.confirm("Delete this recurring schedule?")) return;
    setBusyId(schedule.id);
    setError("");
    setSuccess("");
    try {
      await recurringScheduleService.remove(schedule.id);
      setSuccess("Recurring schedule deleted.");
      if (editingId === schedule.id) resetForm();
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not delete recurring schedule");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <h1 className="h3">Recurring Pickup Schedules</h1>
      <p className="text-muted">Set a regular collection day. Each due schedule creates a normal pickup request for the CleanTrack team.</p>
      <AlertMessage type="danger" message={error} />
      <AlertMessage type="success" message={success} />

      <div className="content-card mb-4">
        <h2 className="h5">{editingId ? "Edit schedule" : "Create schedule"}</h2>
        {locations.length === 0 ? <p className="mb-0">Add a pickup location before creating a schedule.</p> : (
          <form className="row g-3" onSubmit={handleSubmit}>
            <div className="col-md-6">
              <label className="form-label" htmlFor="schedule-location">Pickup location</label>
              <select id="schedule-location" className="form-select" name="location_id" value={form.location_id} onChange={handleChange} required>
                <option value="">Select location</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.location_name} — {location.district}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="schedule-category">Waste category</label>
              <select id="schedule-category" className="form-select" name="waste_category_id" value={form.waste_category_id} onChange={handleChange} required>
                <option value="">Select waste category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="schedule-frequency">Frequency</label>
              <select id="schedule-frequency" className="form-select" name="frequency" value={form.frequency} onChange={handleChange}>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every two weeks</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="schedule-day">Preferred pickup day</label>
              <select id="schedule-day" className="form-select" name="preferred_day" value={form.preferred_day} onChange={handleChange} required>
                {weekdays.map(([day, label]) => <option key={day} value={day}>{label}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="schedule-time">Preferred pickup time</label>
              <input id="schedule-time" className="form-control" type="time" name="preferred_time" value={form.preferred_time} onChange={handleChange} required />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="schedule-start">Start date</label>
              <input id="schedule-start" className="form-control" type="date" name="start_date" min={getLocalDate()} value={form.start_date} onChange={handleChange} required />
            </div>
            <div className="col-12 d-flex gap-2">
              <button className="btn btn-cleantrack" disabled={saving || locations.length === 0 || categories.length === 0}>
                {saving ? "Saving..." : editingId ? "Save changes" : "Create schedule"}
              </button>
              {editingId && <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>Cancel edit</button>}
            </div>
            {categories.length === 0 && <p className="text-muted mb-0">There are no active waste categories available.</p>}
          </form>
        )}
      </div>

      <h2 className="h5">My schedules</h2>
      {loading ? <LoadingSpinner text="Loading schedules..." /> : schedules.length === 0 ? (
        <div className="content-card"><p className="mb-0">You have no recurring pickup schedules yet.</p></div>
      ) : (
        <div className="row g-3">
          {schedules.map((schedule) => (
            <div className="col-lg-6" key={schedule.id}>
              <article className="content-card h-100">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <h3 className="h5 mb-1">{schedule.location_name}</h3>
                    <p className="text-muted">{schedule.waste_category} · {schedule.district}</p>
                  </div>
                  <span className={`badge ${schedule.status === "active" ? "text-bg-success" : "text-bg-secondary"}`}>{schedule.status}</span>
                </div>
                <dl className="row mb-3">
                  <dt className="col-5">Frequency</dt><dd className="col-7">{schedule.frequency === "biweekly" ? "Every two weeks" : "Weekly"}</dd>
                  <dt className="col-5">Pickup day</dt><dd className="col-7">{weekdays.find(([day]) => day === Number(schedule.preferred_day))?.[1]}</dd>
                  <dt className="col-5">Preferred time</dt><dd className="col-7">{schedule.preferred_time.slice(0, 5)}</dd>
                  <dt className="col-5">Next pickup</dt><dd className="col-7">{formatDate(schedule.next_pickup_date)}</dd>
                  <dt className="col-5">Generated pickups</dt><dd className="col-7">{schedule.generated_pickups}</dd>
                </dl>
                <div className="d-flex flex-wrap gap-2">
                  <button className="btn btn-outline-success btn-sm" disabled={busyId === schedule.id} onClick={() => changeStatus(schedule)}>
                    {schedule.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                  <button className="btn btn-outline-primary btn-sm" disabled={busyId === schedule.id} onClick={() => editSchedule(schedule)}>Edit</button>
                  <button className="btn btn-outline-danger btn-sm" disabled={busyId === schedule.id || Number(schedule.generated_pickups) > 0} onClick={() => deleteSchedule(schedule)}>
                    Delete
                  </button>
                  {Number(schedule.generated_pickups) > 0 && <small className="text-muted align-self-center">Deactivate to stop future pickups; generated history is retained.</small>}
                </div>
              </article>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default RecurringSchedules;
