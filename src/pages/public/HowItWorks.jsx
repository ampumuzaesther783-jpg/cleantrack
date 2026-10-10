const HowItWorks = () => (
  <main className="container py-5">
    <h1>How It Works</h1>
    <div className="row g-3 mt-2">
      {[
        ["1", "Create an account", "Choose the correct role: customer, driver, manager, or admin."],
        ["2", "Register locations", "Customers add homes, schools, stalls, businesses, or institutions."],
        ["3", "Report full bins", "Customers select waste type, urgency, bin level, and can upload a photo."],
        ["4", "Assign pickup jobs", "Managers assign pending pickups to company trucks and drivers."],
        ["5", "Complete collection", "Drivers update pickup status and record collected waste quantity."],
        ["6", "Monitor performance", "Admins review users, companies, trucks, pickup status, and statistics."]
      ].map(([number, title, text]) => (
        <div className="col-md-6 col-lg-4" key={number}>
          <div className="content-card h-100">
            <div className="badge text-bg-success mb-3">{number}</div>
            <h2 className="h5">{title}</h2>
            <p className="mb-0 text-muted">{text}</p>
          </div>
        </div>
      ))}
    </div>
  </main>
);

export default HowItWorks;
