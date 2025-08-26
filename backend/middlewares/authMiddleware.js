// middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';
import Teacher from '../models/teacher.model.js';

const authMiddleware = async (req, res, next) => {
  try {
    // Accept token from Authorization header OR httpOnly cookie (set by generateToken)
    const authHeader = req.headers.authorization || '';
    let token = null;

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Support different payload shapes: { userId } or { id } or { _id }
    const userId = decoded.userId || decoded.id || decoded._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token payload.' });
    }

    const teacher = await Teacher.findById(userId).select('-password');
    if (!teacher) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Teacher not found.' });
    }

    req.user = { id: teacher._id.toString(), role: 'teacher' };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized: Token expired.' });
    }
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token.' });
  }
};

export default authMiddleware;
