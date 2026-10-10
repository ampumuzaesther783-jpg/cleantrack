const AlertMessage = ({ type = "info", message }) => {
  if (!message) return null;
  return <div className={`alert alert-${type} py-2`}>{message}</div>;
};

export default AlertMessage;
