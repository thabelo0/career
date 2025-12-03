import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';

class User {
  // Create new user
  static async create(userData) {
    const { name, email, password, user_type } = userData;
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password, user_type, is_verified) 
       VALUES (?, ?, ?, ?, TRUE)`,
      [name, email, hashedPassword, user_type]
    );

    return {
      id: result.insertId,
      name,
      email,
      user_type,
      is_verified: true
    };
  }

  // Find user by email
  static async findByEmail(email) {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return users[0];
  }

  // Find user by ID
  static async findById(id) {
    const [users] = await pool.execute(
      'SELECT id, name, email, user_type, is_verified, created_at FROM users WHERE id = ?',
      [id]
    );
    return users[0];
  }

  // Compare password
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Update reset token
  static async updateResetToken(userId, resetToken) {
    const [result] = await pool.execute(
      'UPDATE users SET reset_token = ? WHERE id = ?',
      [resetToken, userId]
    );
    return result.affectedRows > 0;
  }
}

// ✅ Make sure this line exists and is correct:
export default User;