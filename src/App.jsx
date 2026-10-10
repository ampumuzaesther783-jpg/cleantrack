import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleBasedRoute from "./components/RoleBasedRoute";
import Home from "./pages/public/Home";
import About from "./pages/public/About";
import HowItWorks from "./pages/public/HowItWorks";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import MyLocations from "./pages/customer/MyLocations";
import AddLocation from "./pages/customer/AddLocation";
import ReportFullBin from "./pages/customer/ReportFullBin";
import MyPickupRequests from "./pages/customer/MyPickupRequests";
import PickupDetails from "./pages/customer/PickupDetails";
import DriverDashboard from "./pages/driver/DriverDashboard";
import MyAssignedPickups from "./pages/driver/MyAssignedPickups";
import PickupJobDetails from "./pages/driver/PickupJobDetails";
import CompletedPickups from "./pages/driver/CompletedPickups";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import CompanyProfile from "./pages/manager/CompanyProfile";
import ManageTrucks from "./pages/manager/ManageTrucks";
import AssignPickups from "./pages/manager/AssignPickups";
import CompanyPickups from "./pages/manager/CompanyPickups";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageUsers from "./pages/admin/ManageUsers";
import ManagePickups from "./pages/admin/ManagePickups";
import ManageCompanies from "./pages/admin/ManageCompanies";
import ManageCategories from "./pages/admin/ManageCategories";
import RecurringSchedules from "./pages/customer/RecurringSchedules";
import ReschedulePickup from "./pages/customer/ReschedulePickup";
import ManageRescheduleRequests from "./pages/manager/ManageRescheduleRequests";
import Notifications from "./pages/shared/Notifications";

const App = () => (
  <BrowserRouter>
    {/* React Router maps URLs to page components. Nested routes share layouts. */}
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleBasedRoute roles={["customer"]} />}>
          <Route path="/customer" element={<DashboardLayout />}>
            <Route index element={<CustomerDashboard />} />
            <Route path="locations" element={<MyLocations />} />
            <Route path="locations/new" element={<AddLocation />} />
            <Route path="report-bin" element={<ReportFullBin />} />
            <Route path="pickups" element={<MyPickupRequests />} />
            <Route path="pickups/:id" element={<PickupDetails />} />
            <Route path="schedules" element={<RecurringSchedules />} />
            <Route path="reschedule" element={<ReschedulePickup />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Route>

        <Route element={<RoleBasedRoute roles={["driver"]} />}>
          <Route path="/driver" element={<DashboardLayout />}>
            <Route index element={<DriverDashboard />} />
            <Route path="jobs" element={<MyAssignedPickups />} />
            <Route path="jobs/:id" element={<PickupJobDetails />} />
            <Route path="completed" element={<CompletedPickups />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Route>

        <Route element={<RoleBasedRoute roles={["manager"]} />}>
          <Route path="/manager" element={<DashboardLayout />}>
            <Route index element={<ManagerDashboard />} />
            <Route path="company" element={<CompanyProfile />} />
            <Route path="trucks" element={<ManageTrucks />} />
            <Route path="assign" element={<AssignPickups />} />
            <Route path="pickups" element={<CompanyPickups />} />
            <Route path="reschedule-requests" element={<ManageRescheduleRequests />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Route>

        <Route element={<RoleBasedRoute roles={["admin"]} />}>
          <Route path="/admin" element={<DashboardLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="pickups" element={<ManagePickups />} />
            <Route path="companies" element={<ManageCompanies />} />
            <Route path="categories" element={<ManageCategories />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
