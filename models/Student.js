import { pool } from '../config/database.js';

class Student {
  // Create student profile
  static async createProfile(userId) {
    const [result] = await pool.execute(
      'INSERT INTO students (user_id) VALUES (?)',
      [userId]
    );
    return result.insertId;
  }

  // Find student by user ID
  static async findByUserId(userId) {
    const [students] = await pool.execute(
      `SELECT s.*, u.name, u.email, u.user_type 
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.user_id = ?`,
      [userId]
    );
    return students[0];
  }

  // Update student profile
  static async updateProfile(userId, profileData) {
    const {
      date_of_birth,
      phone,
      address,
      high_school,
      graduation_year,
      grades
    } = profileData;

    const [result] = await pool.execute(
      `UPDATE students 
       SET date_of_birth = ?, phone = ?, address = ?, high_school = ?, 
           graduation_year = ?, grades = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ?`,
      [date_of_birth, phone, address, high_school, graduation_year, JSON.stringify(grades), userId]
    );

    return result.affectedRows > 0;
  }

  // Get student applications
  static async getApplications(studentId) {
    const [applications] = await pool.execute(
      `SELECT 
        a.id, a.status, a.application_date, a.preferred_major,
        c.name as course_name, c.code as course_code,
        i.name as institute_name, i.location as institute_location,
        ap.name as admission_period, ap.status as admission_status
       FROM applications a
       JOIN courses c ON a.course_id = c.id
       JOIN institutes i ON a.institute_id = i.id
       LEFT JOIN admission_periods ap ON a.admission_period_id = ap.id
       WHERE a.student_id = ?
       ORDER BY a.application_date DESC`,
      [studentId]
    );
    return applications;
  }

  // Check if student can apply to more courses in an institute
  static async canApplyToInstitute(studentId, instituteId) {
    const currentYear = new Date().getFullYear();
    
    const [tracking] = await pool.execute(
      `SELECT application_count, courses_applied 
       FROM student_institute_applications 
       WHERE student_id = ? AND institute_id = ? AND academic_year = ?`,
      [studentId, instituteId, currentYear]
    );

    if (tracking.length === 0) {
      return { canApply: true, remainingSlots: 2, currentCount: 0 };
    }

    const record = tracking[0];
    const remainingSlots = Math.max(0, 2 - record.application_count);
    
    return {
      canApply: record.application_count < 2,
      remainingSlots,
      currentCount: record.application_count,
      appliedCourses: JSON.parse(record.courses_applied || '[]')
    };
  }

  // Track application to institute
  static async trackApplication(studentId, instituteId, courseId) {
    const currentYear = new Date().getFullYear();
    
    const [existing] = await pool.execute(
      `SELECT * FROM student_institute_applications 
       WHERE student_id = ? AND institute_id = ? AND academic_year = ?`,
      [studentId, instituteId, currentYear]
    );

    if (existing.length === 0) {
      // First application to this institute
      await pool.execute(
        `INSERT INTO student_institute_applications 
         (student_id, institute_id, courses_applied, application_count, academic_year) 
         VALUES (?, ?, ?, 1, ?)`,
        [studentId, instituteId, JSON.stringify([courseId]), currentYear]
      );
    } else {
      // Update existing record
      const record = existing[0];
      const appliedCourses = JSON.parse(record.courses_applied || '[]');
      
      if (!appliedCourses.includes(courseId)) {
        appliedCourses.push(courseId);
        await pool.execute(
          `UPDATE student_institute_applications 
           SET courses_applied = ?, application_count = application_count + 1 
           WHERE student_id = ? AND institute_id = ? AND academic_year = ?`,
          [JSON.stringify(appliedCourses), studentId, instituteId, currentYear]
        );
      }
    }
  }
}

export default Student;