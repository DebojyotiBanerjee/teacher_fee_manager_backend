const jwt = require('jsonwebtoken');

// Role-based authentication middleware
function authenticateRole(role) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== role) {
        return res.status(403).json({ success: false, message: `Access denied: not a ${role}` });
      }
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  };
}

module.exports = {
  authenticateTeacher: authenticateRole('teacher'),
  authenticateStudent: authenticateRole('student')
};