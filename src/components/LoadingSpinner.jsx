const LoadingSpinner = ({ text = "Loading..." }) => (
  <div className="d-flex align-items-center gap-2 py-3">
    <div className="spinner-border spinner-border-sm text-success" role="status" aria-hidden="true"></div>
    <span>{text}</span>
  </div>
);

export default LoadingSpinner;
