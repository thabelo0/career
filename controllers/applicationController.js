import Application from '../models/Application.js';
import Student from '../models/Student.js';
import Course from '../models/Course.js';
import { validationResult } from 'express-validator';
import { pool } from '../config/database.js';

const applicationController = {
  // Apply to course - UPDATED WITH SAFETY CHECKS
  applyToCourse: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      console.log('Temporary fix - bypassing all validation');
      
      console.log('🎯 Application Controller - Starting application process...');
      console.log('🎯 Application Controller - req.user:', req.user);
      console.log('🎯 Application Controller - req.user.profile:', req.user?.profile);

      // SAFETY CHECK - Add comprehensive validation
      if (!req.user || !req.user.profile || !req.user.profile.id) {
        console.error('❌ Application Controller - User profile missing:', {
          hasUser: !!req.user,
          hasProfile: !!req.user?.profile,
          profileId: req.user?.profile?.id
        });
        return res.status(400).json({
          success: false,
          message: 'User profile not found. Please complete your student profile.'
        });
      }

      const studentId = req.user.profile.id;
      console.log('🎯 Application Controller - Using student ID:', studentId);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { courseId, preferredMajor, personalStatement, documents } = req.body;
      
      console.log('🎯 Application Controller - Received application data:', {
        courseId,
        preferredMajor,
        personalStatementLength: personalStatement?.length
      });

      // Validate required fields
      if (!courseId) {
        return res.status(400).json({
          success: false,
          message: 'Course ID is required'
        });
      }

      // Get course details
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      console.log('✅ Application Controller - Course found:', course.name);

      // Check if course is active
      if (!course.is_active) {
        return res.status(400).json({
          success: false,
          message: 'This course is not currently accepting applications'
        });
      }

      // Check application deadline
      if (course.application_deadline && new Date(course.application_deadline) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Application deadline has passed for this course'
        });
      }

      // Check if student is already enrolled in another institute
      const [existingAcceptances] = await connection.execute(
        `SELECT a.*, i.name as institute_name 
         FROM applications a 
         JOIN institutes i ON a.institute_id = i.id 
         WHERE a.student_id = ? AND a.status = 'accepted' AND a.institute_id != ?`,
        [studentId, course.institute_id]
      );

      if (existingAcceptances.length > 0) {
        return res.status(400).json({
          success: false,
          message: `You are already admitted to ${existingAcceptances[0].institute_name}. You cannot apply to other institutes.`
        });
      }

      // Check if student can apply to more courses in this institute
      const applicationStatus = await Student.canApplyToInstitute(studentId, course.institute_id);
      if (!applicationStatus.canApply) {
        return res.status(400).json({
          success: false,
          message: `You can only apply to maximum 2 courses per institute. You have already applied to ${applicationStatus.currentCount} courses.`
        });
      }

      console.log('✅ Application Controller - Student can apply, remaining slots:', applicationStatus.remainingSlots);

      // Check if student already applied to this course in current admission period
      const currentYear = new Date().getFullYear();
      const [existingApplication] = await connection.execute(
        `SELECT a.* 
         FROM applications a 
         JOIN admission_periods ap ON a.admission_period_id = ap.id 
         WHERE a.student_id = ? AND a.course_id = ? AND ap.status = 'active'`,
        [studentId, courseId]
      );

      if (existingApplication.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You have already applied to this course in the current admission period'
        });
      }

     // Get active admission period for the institute
const [admissionPeriods] = await connection.execute(
  `SELECT * FROM admission_periods 
   WHERE institute_id = ? AND status = 'active' 
   AND start_date <= CURDATE() AND end_date >= CURDATE() 
   LIMIT 1`,
  [course.institute_id]
);

// ✅ FIX: Initialize admissionPeriod variable first
let admissionPeriod;

if (admissionPeriods.length === 0) {
  console.log('⚠️ No active admission period found, using fallback');
  
  // Try to get ANY admission period for this institute
  const [anyPeriods] = await connection.execute(
    `SELECT * FROM admission_periods 
     WHERE institute_id = ? 
     LIMIT 1`,
    [course.institute_id]
  );
  
  if (anyPeriods.length > 0) {
    // Use existing period and make it active
    admissionPeriod = anyPeriods[0];
    await connection.execute(
      'UPDATE admission_periods SET status = "active" WHERE id = ?',
      [admissionPeriod.id]
    );
    console.log('✅ Activated existing admission period:', admissionPeriod.name);
  } else {
    // Create a new admission period
    const [newPeriod] = await connection.execute(
      `INSERT INTO admission_periods (institute_id, name, start_date, end_date, status) 
       VALUES (?, 'Auto-Created Admissions', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 'active')`,
      [course.institute_id]
    );
    admissionPeriod = {
      id: newPeriod.insertId,
      name: 'Auto-Created Admissions'
    };
    console.log('✅ Created new admission period:', admissionPeriod.id);
  }
} else {
  admissionPeriod = admissionPeriods[0];
  console.log('✅ Application Controller - Admission period found:', admissionPeriod.name);
}

// ✅ NOW it's safe to use admissionPeriod
console.log('✅ Application Controller - Admission period:', admissionPeriod.name);


      // Create application
      const applicationId = await Application.create({
        student_id: studentId,
        course_id: courseId,
        institute_id: course.institute_id,
        admission_period_id: admissionPeriod.id,
        preferred_major: preferredMajor,
        personal_statement: personalStatement,
        documents: documents || []
      });

      console.log('✅ Application Controller - Application created with ID:', applicationId);

      // Track application for institute limit
      await Student.trackApplication(studentId, course.institute_id, courseId);

      // Update admission period application count
      await connection.execute(
        'UPDATE admission_periods SET total_applications = total_applications + 1 WHERE id = ?',
        [admissionPeriod.id]
      );

      await connection.commit();

      console.log('🎉 Application Controller - Application submitted successfully!');

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully!',
        data: {
          applicationId,
          remainingSlots: applicationStatus.remainingSlots - 1
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('❌ Application Controller - Error:', error);
      console.error('❌ Application Controller - Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to submit application. Please try again.'
      });
    } finally {
      connection.release();
    }
  },

  // Get student applications - UPDATED WITH SAFETY CHECK
  getStudentApplications: async (req, res) => {
    try {
      console.log('📋 Application Controller - Getting student applications...');
      console.log('📋 Application Controller - req.user:', req.user);

      // Safety check
      if (!req.user || !req.user.profile || !req.user.profile.id) {
        return res.status(400).json({
          success: false,
          message: 'Student profile not found.'
        });
      }

      const studentId = req.user.profile.id;
      const applications = await Student.getApplications(studentId);

      res.json({
        success: true,
        data: applications
      });

    } catch (error) {
      console.error('Get applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch applications'
      });
    }
  },

  // Get institute applications - UPDATED WITH SAFETY CHECK
  getInstituteApplications: async (req, res) => {
    try {
      console.log('🏫 Application Controller - Getting institute applications...');
      
      // Safety check
      if (!req.user || !req.user.profile || !req.user.profile.id) {
        return res.status(400).json({
          success: false,
          message: 'Institute profile not found.'
        });
      }

      const instituteId = req.user.profile.id;
      const { status, courseId, page = 1, limit = 10 } = req.query;

      let query = `
        SELECT 
          a.*,
          c.name as course_name,
          c.code as course_code,
          u.name as student_name,
          u.email as student_email,
          s.grades as student_grades,
          s.high_school,
          s.graduation_year
        FROM applications a
        JOIN courses c ON a.course_id = c.id
        JOIN faculties f ON c.faculty_id = f.id
        JOIN students s ON a.student_id = s.id
        JOIN users u ON s.user_id = u.id
        WHERE f.institute_id = ?
      `;

      const params = [instituteId];

      if (status) {
        query += ' AND a.status = ?';
        params.push(status);
      }

      if (courseId) {
        query += ' AND a.course_id = ?';
        params.push(courseId);
      }

      query += ' ORDER BY a.application_date DESC LIMIT ? OFFSET ?';
      const offset = (page - 1) * limit;
      params.push(parseInt(limit), offset);

      const [applications] = await pool.execute(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM applications a
        JOIN courses c ON a.course_id = c.id
        JOIN faculties f ON c.faculty_id = f.id
        WHERE f.institute_id = ?
      `;
      const countParams = [instituteId];

      if (status) {
        countQuery += ' AND a.status = ?';
        countParams.push(status);
      }

      if (courseId) {
        countQuery += ' AND a.course_id = ?';
        countParams.push(courseId);
      }

      const [countResult] = await pool.execute(countQuery, countParams);
      const total = countResult[0].total;

      res.json({
        success: true,
        data: {
          applications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      console.error('Get institute applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch applications'
      });
    }
  },

  // Update application status (Institute only) - UPDATED WITH SAFETY CHECK
  updateApplicationStatus: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Safety check
      if (!req.user || !req.user.profile || !req.user.profile.id) {
        return res.status(400).json({
          success: false,
          message: 'Institute profile not found.'
        });
      }

      const { applicationId } = req.params;
      const { status, reviewNotes } = req.body;
      const instituteId = req.user.profile.id;

      // Verify application belongs to institute
      const [applications] = await connection.execute(
        `SELECT a.* 
         FROM applications a
         JOIN courses c ON a.course_id = c.id
         JOIN faculties f ON c.faculty_id = f.id
         WHERE a.id = ? AND f.institute_id = ?`,
        [applicationId, instituteId]
      );

      if (applications.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      const application = applications[0];

      // If accepting application, check if student is already accepted elsewhere
      if (status === 'accepted') {
        const [otherAcceptances] = await connection.execute(
          `SELECT i.name 
           FROM applications a 
           JOIN institutes i ON a.institute_id = i.id 
           WHERE a.student_id = ? AND a.status = 'accepted' AND a.institute_id != ?`,
          [application.student_id, instituteId]
        );

        if (otherAcceptances.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Student is already admitted to ${otherAcceptances[0].name}. Cannot accept application.`
          });
        }

        // Reject all other pending applications from this student
        await connection.execute(
          `UPDATE applications 
           SET status = 'rejected', review_notes = 'Automatically rejected: Student accepted at another institute'
           WHERE student_id = ? AND status = 'pending' AND id != ?`,
          [application.student_id, applicationId]
        );
      }

      const updated = await Application.updateStatus(applicationId, status, reviewNotes);

      if (!updated) {
        throw new Error('Failed to update application status');
      }

      await connection.commit();

      res.json({
        success: true,
        message: `Application ${status} successfully`
      });

    } catch (error) {
      await connection.rollback();
      console.error('Update application status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update application status'
      });
    } finally {
      connection.release();
    }
  },

  // Withdraw application - UPDATED WITH SAFETY CHECK
  withdrawApplication: async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Safety check
      if (!req.user || !req.user.profile || !req.user.profile.id) {
        return res.status(400).json({
          success: false,
          message: 'Student profile not found.'
        });
      }

      const { applicationId } = req.params;
      const studentId = req.user.profile.id;

      // Verify application belongs to student
      const [applications] = await connection.execute(
        'SELECT * FROM applications WHERE id = ? AND student_id = ?',
        [applicationId, studentId]
      );

      if (applications.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      const application = applications[0];

      if (application.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending applications can be withdrawn'
        });
      }

      const updated = await Application.updateStatus(applicationId, 'withdrawn', 'Withdrawn by student');

      if (!updated) {
        throw new Error('Failed to withdraw application');
      }

      await connection.execute(
        `UPDATE student_institute_applications 
         SET application_count = application_count - 1,
             courses_applied = JSON_REMOVE(courses_applied, JSON_UNQUOTE(JSON_SEARCH(courses_applied, 'one', ?)))
         WHERE student_id = ? AND institute_id = ? AND academic_year = YEAR(CURDATE())`,
        [application.course_id.toString(), studentId, application.institute_id]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Application withdrawn successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Withdraw application error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to withdraw application'
      });
    } finally {
      connection.release();
    }
  }
};

export default applicationController;