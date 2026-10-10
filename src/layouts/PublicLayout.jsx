import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

const PublicLayout = () => (
  <>
    <Navbar />
    <Outlet />
  </>
);

export default PublicLayout;
