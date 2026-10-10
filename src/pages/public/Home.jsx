import { Link } from "react-router-dom";
import { Building2, MapPinned, Truck } from "lucide-react";

const Home = () => (
  <>
    <section className="hero">
      <div className="container">
        <div className="col-lg-7">
          <h1 className="display-4 fw-bold">CleanTrack Uganda</h1>
          <p className="lead mt-3">
            A learning-friendly waste pickup platform for residents, businesses, institutions, collection teams, and municipal admins.
          </p>
          <div className="d-flex flex-wrap gap-2 mt-4">
            <Link to="/register" className="btn btn-cleantrack btn-lg">Report a Full Bin</Link>
            <Link to="/how-it-works" className="btn btn-outline-light btn-lg">How It Works</Link>
          </div>
        </div>
      </div>
    </section>
    <section className="container py-5">
      <div className="row g-3">
        {[
          [MapPinned, "Residents report bins", "Customers register locations and send pickup requests with waste type, urgency, and optional photos."],
          [Truck, "Drivers update jobs", "Collectors see assigned work, mark routes on the way, complete pickups, or record failed attempts."],
          [Building2, "Managers and admins monitor", "Companies assign trucks while admins view users, requests, companies, and system statistics."]
        ].map(([Icon, title, text]) => (
          <div className="col-md-4" key={title}>
            <div className="content-card h-100">
              <Icon className="text-success mb-3" size={32} />
              <h2 className="h5">{title}</h2>
              <p className="mb-0 text-muted">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  </>
);

export default Home;
