import { pool } from '../config/database.js';

class Institute {
  // Create institute profile
  static async createProfile(userId, name) {
    const [result] = await pool.execute(
      'INSERT INTO institutes (user_id, name) VALUES (?, ?)',
      [userId, name]
    );
    return result.insertId;
  }

  // Find institute by user ID
  static async findByUserId(userId) {
    const [institutes] = await pool.execute(
      `SELECT i.*, u.name, u.email, u.user_type 
       FROM institutes i 
       JOIN users u ON i.user_id = u.id 
       WHERE i.user_id = ?`,
      [userId]
    );
    return institutes[0];
  }

  // Update institute profile
  static async updateProfile(userId, profileData) {
    const {
      name,
      description,
      location,
      contact_email,
      contact_phone,
      website,
      established_year,
      accreditation,
      total_students,
      address
    } = profileData;

    const [result] = await pool.execute(
      `UPDATE institutes 
       SET name = ?, description = ?, location = ?, contact_email = ?, 
           contact_phone = ?, website = ?, established_year = ?, 
           accreditation = ?, total_students = ?, address = ?
       WHERE user_id = ?`,
      [
        name, description, location, contact_email, contact_phone,
        website, established_year, accreditation, total_students, address, userId
      ]
    );

    return result.affectedRows > 0;
  }

  // Get all institutes (for browsing)
  static async getAll() {
    const [institutes] = await pool.execute(
      `SELECT 
        i.*, 
        u.name as contact_name,
        COUNT(DISTINCT f.id) as faculty_count,
        COUNT(DISTINCT c.id) as course_count,
        (SELECT COUNT(*) FROM admission_periods ap WHERE ap.institute_id = i.id AND ap.status = 'active') as active_admissions
       FROM institutes i
       JOIN users u ON i.user_id = u.id
       LEFT JOIN faculties f ON i.id = f.institute_id
       LEFT JOIN courses c ON f.id = c.faculty_id
       WHERE u.is_verified = TRUE
       GROUP BY i.id
       ORDER BY i.name`
    );
    return institutes;
  }

  // Get institute by ID
  static async findById(instituteId) {
    const [institutes] = await pool.execute(
      `SELECT 
        i.*, 
        u.name as contact_name,
        COUNT(DISTINCT f.id) as faculty_count,
        COUNT(DISTINCT c.id) as course_count
       FROM institutes i
       JOIN users u ON i.user_id = u.id
       LEFT JOIN faculties f ON i.id = f.institute_id
       LEFT JOIN courses c ON f.id = c.faculty_id
       WHERE i.id = ? AND u.is_verified = TRUE
       GROUP BY i.id`,
      [instituteId]
    );
    return institutes[0];
  }

  // Get institute faculties
  static async getFaculties(instituteId) {
    const [faculties] = await pool.execute(
      `SELECT f.*, COUNT(c.id) as course_count
       FROM faculties f
       LEFT JOIN courses c ON f.id = c.faculty_id AND c.is_active = TRUE
       WHERE f.institute_id = ?
       GROUP BY f.id
       ORDER BY f.name`,
      [instituteId]
    );
    return faculties;
  }

  // Get institute courses
  static async getCourses(instituteId) {
    const [courses] = await pool.execute(
      `SELECT 
        c.*, 
        f.name as faculty_name,
        (SELECT COUNT(*) FROM applications a WHERE a.course_id = c.id AND a.status = 'pending') as pending_applications
       FROM courses c
       JOIN faculties f ON c.faculty_id = f.id
       WHERE f.institute_id = ? AND c.is_active = TRUE
       ORDER BY c.name`,
      [instituteId]
    );
    return courses;
  }
}

export default Institute;