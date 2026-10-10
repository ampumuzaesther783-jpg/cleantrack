import { useCallback, useEffect, useState } from "react";
import { CheckCheck, Check } from "lucide-react";
import AlertMessage from "../../components/AlertMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead } from "../../services/notificationService";

const Notifications = () => {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [notifications, count] = await Promise.all([getNotifications(), getUnreadCount()]);
      setItems(notifications);
      setUnreadCount(count.unread_count);
    }
    catch (apiError) { setError(apiError.response?.data?.message || "Could not load notifications. Please try again."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markOne = async (id) => {
    setSaving(id); setError(""); setSuccess("");
    try {
      await markNotificationRead(id);
      setUnreadCount((count) => Math.max(0, count - 1));
      setItems((current) => current.map((item) => item.id === id ? { ...item, status: "read", read_at: new Date().toISOString() } : item));
      setSuccess("Notification marked as read.");
      window.dispatchEvent(new Event("cleantrack-notifications-changed"));
    } catch (apiError) { setError(apiError.response?.data?.message || "Could not update this notification."); }
    finally { setSaving(null); }
  };

  const markAll = async () => {
    setSaving("all"); setError(""); setSuccess("");
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setItems((current) => current.map((item) => ({ ...item, status: "read", read_at: item.read_at || new Date().toISOString() })));
      setSuccess("All notifications marked as read.");
      window.dispatchEvent(new Event("cleantrack-notifications-changed"));
    } catch (apiError) { setError(apiError.response?.data?.message || "Could not update notifications."); }
    finally { setSaving(null); }
  };

  return (
    <section>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div><h1 className="h3 mb-1">Notifications</h1><p className="text-muted mb-0">{unreadCount} unread</p></div>
        <button className="btn btn-outline-success btn-sm" onClick={markAll} disabled={!unreadCount || saving !== null}>
          <CheckCheck size={16} className="me-1" />Mark all as read
        </button>
      </div>
      <AlertMessage type="danger" message={error} />
      <AlertMessage type="success" message={success} />
      {loading ? <LoadingSpinner text="Loading notifications..." /> : items.length === 0 ? (
        <div className="card border-0 shadow-sm"><div className="card-body text-center py-5">
          <h2 className="h5">You’re all caught up</h2><p className="text-muted mb-0">New pickup updates will appear here.</p>
        </div></div>
      ) : (
        <div className="list-group shadow-sm">
          {items.map((item) => (
            <article key={item.id} className={`list-group-item p-3 ${item.status === "unread" ? "border-start border-4 border-success bg-light" : ""}`}>
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div><div className="d-flex align-items-center gap-2"><h2 className="h6 mb-1">{item.title}</h2>{item.status === "unread" && <span className="badge text-bg-success">Unread</span>}</div>
                  <p className="mb-2">{item.message}</p><small className="text-muted">{new Date(item.created_at).toLocaleString()}</small>
                </div>
                {item.status === "unread" && <button className="btn btn-outline-secondary btn-sm text-nowrap" onClick={() => markOne(item.id)} disabled={saving !== null}>
                  <Check size={15} className="me-1" />{saving === item.id ? "Saving..." : "Mark as read"}
                </button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default Notifications;
