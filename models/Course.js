import { pool } from '../config/database.js';

class Course {
  // Create course
  static async create(courseData) {
    const {
      faculty_id,
      name,
      code,
      description,
      duration,
      duration_unit,
      requirements,
      fees,
      intake_capacity,
      application_deadline
    } = courseData;

    const [result] = await pool.execute(
      `INSERT INTO courses 
       (faculty_id, name, code, description, duration, duration_unit, requirements, fees, intake_capacity, application_deadline) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        faculty_id,
        name,
        code,
        description,
        duration,
        duration_unit,
        JSON.stringify(requirements),
        JSON.stringify(fees),
        intake_capacity,
        application_deadline
      ]
    );

    return result.insertId;
  }

  // Find course by ID
  static async findById(courseId) {
    const [courses] = await pool.execute(
      `SELECT 
        c.*, 
        f.name as faculty_name,
        i.name as institute_name,
        i.id as institute_id
       FROM courses c
       JOIN faculties f ON c.faculty_id = f.id
       JOIN institutes i ON f.institute_id = i.id
       WHERE c.id = ? AND c.is_active = TRUE`,
      [courseId]
    );
    return courses[0];
  }

  // Update course
  static async update(courseId, courseData) {
    const {
      name,
      description,
      duration,
      duration_unit,
      requirements,
      fees,
      intake_capacity,
      application_deadline,
      is_active
    } = courseData;

    const [result] = await pool.execute(
      `UPDATE courses 
       SET name = ?, description = ?, duration = ?, duration_unit = ?, 
           requirements = ?, fees = ?, intake_capacity = ?, 
           application_deadline = ?, is_active = ?
       WHERE id = ?`,
      [
        name,
        description,
        duration,
        duration_unit,
        JSON.stringify(requirements),
        JSON.stringify(fees),
        intake_capacity,
        application_deadline,
        is_active,
        courseId
      ]
    );

    return result.affectedRows > 0;
  }

  // Delete course (soft delete)
  static async delete(courseId) {
    const [result] = await pool.execute(
      'UPDATE courses SET is_active = FALSE WHERE id = ?',
      [courseId]
    );
    return result.affectedRows > 0;
  }

  // Check course eligibility for student
  static async checkEligibility(courseId, studentGrades) {
    const course = await this.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const requirements = JSON.parse(course.requirements);
    const issues = [];

    // Check minimum grade
    // This would need actual grade comparison logic

    // Check required subjects
    if (requirements.requiredSubjects && requirements.requiredSubjects.length > 0) {
      const missingSubjects = requirements.requiredSubjects.filter(
        subject => !studentGrades[subject]
      );
      if (missingSubjects.length > 0) {
        issues.push(`Missing required subjects: ${missingSubjects.join(', ')}`);
      }
    }

    // Check minimum GPA
    if (requirements.minGPA) {
      // This would need actual GPA calculation from student grades
    }

    return {
      isEligible: issues.length === 0,
      issues,
      requirements
    };
  }

  // Get course applications
  static async getApplications(courseId) {
    const [applications] = await pool.execute(
      `SELECT 
        a.*,
        s.user_id as student_user_id,
        u.name as student_name,
        u.email as student_email
       FROM applications a
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE a.course_id = ?
       ORDER BY a.application_date DESC`,
      [courseId]
    );
    return applications;
  }
}

export default Course;