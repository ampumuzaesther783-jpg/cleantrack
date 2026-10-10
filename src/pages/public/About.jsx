const About = () => (
  <main className="container py-5">
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <h1>About CleanTrack Uganda</h1>
        <p className="lead">
          CleanTrack Uganda is a student-learning full-stack project that models how waste collection can be coordinated across customers, drivers, waste companies, and administrators.
        </p>
        <div className="content-card mt-4">
          <h2 className="h5">What students learn</h2>
          <p>
            The project demonstrates authentication, protected routes, role-based access control, image uploads, database queries, React state, form handling, and API service modules.
          </p>
          <p className="mb-0">
            The code is intentionally direct so beginners can follow how a request moves from a React form to an Express route, controller, middleware, and MariaDB table.
          </p>
        </div>
      </div>
    </div>
  </main>
);

export default About;
