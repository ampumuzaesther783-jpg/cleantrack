import { NavLink, Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

const menus = {
  customer: [
    ["Dashboard", "/customer"],
    ["My Locations", "/customer/locations"],
    ["Add Location", "/customer/locations/new"],
    ["Report Full Bin", "/customer/report-bin"],
    ["Pickup Requests", "/customer/pickups"],
    ["Pickup Schedules", "/customer/schedules"],
    ["Reschedule Pickup", "/customer/reschedule"],
    ["Notifications", "/customer/notifications"]
  ],
  driver: [
    ["Dashboard", "/driver"],
    ["Assigned Pickups", "/driver/jobs"],
    ["Completed Pickups", "/driver/completed"],
    ["Notifications", "/driver/notifications"]
  ],
  manager: [
    ["Dashboard", "/manager"],
    ["Company Profile", "/manager/company"],
    ["Manage Trucks", "/manager/trucks"],
    ["Assign Pickups", "/manager/assign"],
    ["Company Pickups", "/manager/pickups"],
    ["Reschedule Requests", "/manager/reschedule-requests"],
    ["Notifications", "/manager/notifications"]
  ],
  admin: [
    ["Dashboard", "/admin"],
    ["Users", "/admin/users"],
    ["Pickups", "/admin/pickups"],
    ["Companies", "/admin/companies"],
    ["Categories", "/admin/categories"],
    ["Notifications", "/admin/notifications"]
  ]
};

const DashboardLayout = () => {
  const { user } = useAuth();
  const links = menus[user?.role] || [];

  return (
    <>
      <Navbar />
      <div className="container-fluid dashboard-shell">
        <div className="row min-vh-100">
          <aside className="col-md-3 col-xl-2 sidebar p-3">
            <div className="nav flex-column gap-1">
              {links.map(([label, to]) => (
                <NavLink key={to} className="nav-link" to={to} end>
                  {label}
                </NavLink>
              ))}
            </div>
          </aside>
          <main className="col-md-9 col-xl-10 p-3 p-lg-4">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;
