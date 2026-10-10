const allowRoles = (...roles) => {
  return (req, res, next) => {
    // Role checks keep users inside the parts of the system they are allowed to use.
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to access this resource" });
    }

    next();
  };
};

module.exports = { allowRoles };
