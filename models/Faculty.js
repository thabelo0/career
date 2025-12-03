import { pool } from '../config/database.js';

class Faculty {
  // Create faculty
  static async create(facultyData) {
    const { institute_id, name, description, dean_name, contact_email, contact_phone, established_year } = facultyData;
    
    const [result] = await pool.execute(
      `INSERT INTO faculties (institute_id, name, description, dean_name, contact_email, contact_phone, established_year) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [institute_id, name, description, dean_name, contact_email, contact_phone, established_year]
    );

    return result.insertId;
  }

  // Find faculty by ID
  static async findById(facultyId) {
    const [faculties] = await pool.execute(
      `SELECT f.*, i.name as institute_name 
       FROM faculties f 
       JOIN institutes i ON f.institute_id = i.id 
       WHERE f.id = ?`,
      [facultyId]
    );
    return faculties[0];
  }

  // Update faculty
  static async update(facultyId, facultyData) {
    const { name, description, dean_name, contact_email, contact_phone, established_year } = facultyData;
    
    const [result] = await pool.execute(
      `UPDATE faculties 
       SET name = ?, description = ?, dean_name = ?, contact_email = ?, 
           contact_phone = ?, established_year = ? 
       WHERE id = ?`,
      [name, description, dean_name, contact_email, contact_phone, established_year, facultyId]
    );

    return result.affectedRows > 0;
  }

  // Delete faculty
  static async delete(facultyId) {
    const [result] = await pool.execute(
      'DELETE FROM faculties WHERE id = ?',
      [facultyId]
    );
    return result.affectedRows > 0;
  }

  // Get faculty courses
  static async getCourses(facultyId) {
    const [courses] = await pool.execute(
      `SELECT c.*, COUNT(a.id) as total_applications
       FROM courses c
       LEFT JOIN applications a ON c.id = a.course_id
       WHERE c.faculty_id = ? AND c.is_active = TRUE
       GROUP BY c.id
       ORDER BY c.name`,
      [facultyId]
    );
    return courses;
  }
}

export default Faculty;