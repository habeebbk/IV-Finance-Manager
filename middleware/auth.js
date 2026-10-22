function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
  }
  next();
}

function requireStudent(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  if (req.session.user.role !== 'student') {
    return res.status(403).json({ error: 'Access denied: Student access required.' });
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireStudent
};
