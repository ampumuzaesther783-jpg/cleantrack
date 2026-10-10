import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { getUnreadCount } from "../services/notificationService";

const rolePath = { customer: "/customer", driver: "/driver", manager: "/manager", admin: "/admin" };

const NotificationBell = ({ role }) => {
  const [count, setCount] = useState(0);
  const refresh = useCallback(async () => {
    try { setCount((await getUnreadCount()).unread_count); } catch { /* The center displays API errors; keep the shell usable. */ }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("cleantrack-notifications-changed", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("cleantrack-notifications-changed", refresh);
    };
  }, [refresh]);

  return (
    <Link className="btn btn-outline-success btn-sm position-relative d-inline-flex align-items-center gap-1" to={`${rolePath[role]}/notifications`} aria-label={`Notifications, ${count} unread`}>
      <Bell size={16} /> Notifications
      {count > 0 && <span className="badge rounded-pill text-bg-danger">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
};

export default NotificationBell;
