import { pool } from '../config/database.js';

class Application {
  // Create application
  static async create(applicationData) {
    const {
      student_id,
      course_id,
      institute_id,
      admission_period_id,
      preferred_major,
      personal_statement,
      documents
    } = applicationData;

    const [result] = await pool.execute(
      `INSERT INTO applications 
       (student_id, course_id, institute_id, admission_period_id, preferred_major, personal_statement, documents) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id,
        course_id,
        institute_id,
        admission_period_id,
        preferred_major,
        personal_statement,
        JSON.stringify(documents || [])
      ]
    );

    return result.insertId;
  }

  // Update application status
  static async updateStatus(applicationId, status, reviewNotes = null) {
    const [result] = await pool.execute(
      `UPDATE applications 
       SET status = ?, review_notes = ?, reviewed_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, reviewNotes, applicationId]
    );

    return result.affectedRows > 0;
  }

  // Find application by ID
  static async findById(applicationId) {
    const [applications] = await pool.execute(
      `SELECT 
        a.*,
        c.name as course_name,
        c.code as course_code,
        i.name as institute_name,
        u.name as student_name,
        u.email as student_email
       FROM applications a
       JOIN courses c ON a.course_id = c.id
       JOIN institutes i ON a.institute_id = i.id
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE a.id = ?`,
      [applicationId]
    );
    return applications[0];
  }

  // Get application statistics for institute
  static async getInstituteStats(instituteId) {
    const [stats] = await pool.execute(
      `SELECT 
        status,
        COUNT(*) as count
       FROM applications a
       JOIN courses c ON a.course_id = c.id
       JOIN faculties f ON c.faculty_id = f.id
       WHERE f.institute_id = ?
       GROUP BY status`,
      [instituteId]
    );
    return stats;
  }

  // Check if student has any accepted applications
  static async hasAcceptedApplication(studentId) {
    const [applications] = await pool.execute(
      'SELECT id FROM applications WHERE student_id = ? AND status = "accepted"',
      [studentId]
    );
    return applications.length > 0;
  }
}

export default Application;