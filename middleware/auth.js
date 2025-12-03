import { pool } from '../config/database.js';

const auth = async (req, res, next) => {
  try {
    // Get user ID from header
    const userId = req.header('X-User-Id');
    
    console.log('🟡 Auth Middleware - Received X-User-Id:', userId);
    console.log('🟡 Auth Middleware - Request URL:', req.url);
    console.log('🟡 Auth Middleware - Request Headers:', req.headers);

    if (!userId) {
      console.log('Auth Middleware - No X-User-Id header found');
      return res.status(401).json({
        success: false,
        message: 'User identification required. Please log in again.'
      });
    }

    // Get user from database
    const [users] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.user_type, u.is_verified 
       FROM users u 
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      console.log(' Auth Middleware - User not found in database for ID:', userId);
      return res.status(401).json({
        success: false,
        message: 'User not found.'
      });
    }

    const user = users[0];
    console.log('✅ Auth Middleware - User found:', {
      id: user.id,
      name: user.name,
      type: user.user_type
    });

    // Get user profile based on type
    let profile = null;
    if (user.user_type === 'student') {
      console.log('📚 Auth Middleware - Getting student profile...');
      const [students] = await pool.execute(
        'SELECT * FROM students WHERE user_id = ?',
        [user.id]
      );
      profile = students[0];
      console.log('📚 Auth Middleware - Student profile result:', profile);
    } else if (user.user_type === 'institute') {
      console.log('🏫 Auth Middleware - Getting institute profile...');
      const [institutes] = await pool.execute(
        'SELECT * FROM institutes WHERE user_id = ?',
        [user.id]
      );
      profile = institutes[0];
    }

    if (!profile) {
      console.log('❌ Auth Middleware - No profile found for user:', user.id);
      return res.status(400).json({
        success: false,
        message: 'User profile not found. Please complete your profile.'
      });
    }

    console.log('✅ Auth Middleware - Profile found with ID:', profile.id);

    // Set user data with profile
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      user_type: user.user_type,
      is_verified: user.is_verified,
      profile: profile
    };

    console.log('🎉 Auth Middleware - Success! req.user.profile.id:', req.user.profile.id);
    next();

  } catch (error) {
    console.error('❌ Auth Middleware - Error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error.'
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.user_type)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    next();
  };
};

export { auth, requireRole };