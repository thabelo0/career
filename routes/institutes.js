import express from 'express';
import { body, param, query } from 'express-validator';
import instituteController from '../controllers/instituteController.js';
import facultyController from '../controllers/facultyController.js';
import courseController from '../controllers/courseController.js';
import admissionController from '../controllers/admissionController.js';
import applicationController from '../controllers/applicationController.js';
import { auth, requireRole } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();

// Public routes
router.get('/', instituteController.getAllInstitutes);
router.get('/:id', instituteController.getInstituteById);
router.get('/:id/faculties', instituteController.getInstituteFaculties);
router.get('/:id/courses', instituteController.getInstituteCourses);

// Add missing routes for institute management - REMOVED AUTHENTICATION
router.get('/faculties/all', async (req, res) => {
  try {
    const [faculties] = await pool.execute(`
      SELECT f.*, i.name as institute_name 
      FROM faculties f 
      JOIN institutes i ON f.institute_id = i.id 
      ORDER BY f.name
    `);
    res.json({
      success: true,
      data: faculties
    });
  } catch (error) {
    console.error('Get all faculties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch faculties'
    });
  }
});

router.get('/courses/all', async (req, res) => {
  try {
    const [courses] = await pool.execute(`
      SELECT 
        c.*, 
        f.name as faculty_name,
        i.name as institute_name
      FROM courses c
      JOIN faculties f ON c.faculty_id = f.id
      JOIN institutes i ON f.institute_id = i.id
      WHERE c.is_active = TRUE
      ORDER BY c.name
    `);
    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Get all courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses'
    });
  }
});

// Institute profile routes (protected)
router.put('/profile', auth, requireRole(['institute']), instituteController.updateInstituteProfile);

// Institute stats route (protected)
router.get('/stats/dashboard', auth, requireRole(['institute']), async (req, res) => {
  try {
    const instituteId = req.user.profile.id;
    
    // Get total applications
    const [totalApps] = await pool.execute(`
      SELECT COUNT(*) as total 
      FROM applications a
      JOIN courses c ON a.course_id = c.id
      JOIN faculties f ON c.faculty_id = f.id
      WHERE f.institute_id = ?
    `, [instituteId]);

    // Get pending applications
    const [pendingApps] = await pool.execute(`
      SELECT COUNT(*) as total 
      FROM applications a
      JOIN courses c ON a.course_id = c.id
      JOIN faculties f ON c.faculty_id = f.id
      WHERE f.institute_id = ? AND a.status = 'pending'
    `, [instituteId]);

    // Get courses count
    const [coursesCount] = await pool.execute(`
      SELECT COUNT(*) as total 
      FROM courses c
      JOIN faculties f ON c.faculty_id = f.id
      WHERE f.institute_id = ? AND c.is_active = TRUE
    `, [instituteId]);

    // Get faculties count
    const [facultiesCount] = await pool.execute(`
      SELECT COUNT(*) as total 
      FROM faculties 
      WHERE institute_id = ?
    `, [instituteId]);

    res.json({
      success: true,
      data: {
        totalApplications: totalApps[0].total,
        pendingApplications: pendingApps[0].total,
        coursesOffered: coursesCount[0].total,
        faculties: facultiesCount[0].total
      }
    });

  } catch (error) {
    console.error('Get institute stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch institute statistics'
    });
  }
});

// Faculty management routes (protected for institutes)
router.post('/faculties', auth, requireRole(['institute']), facultyController.createFaculty);
router.put('/faculties/:id', auth, requireRole(['institute']), facultyController.updateFaculty);
router.delete('/faculties/:id', auth, requireRole(['institute']), facultyController.deleteFaculty);

// Course management routes (protected for institutes)
router.post('/courses', auth, requireRole(['institute']), courseController.createCourse);
router.put('/courses/:id', auth, requireRole(['institute']), courseController.updateCourse);
router.delete('/courses/:id', auth, requireRole(['institute']), courseController.deleteCourse);

// Course details route (public)
router.get('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [courses] = await pool.execute(`
      SELECT 
        c.*, 
        f.name as faculty_name,
        i.name as institute_name,
        i.id as institute_id
      FROM courses c
      JOIN faculties f ON c.faculty_id = f.id
      JOIN institutes i ON f.institute_id = i.id
      WHERE c.id = ? AND c.is_active = TRUE
    `, [id]);

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      data: courses[0]
    });

  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course'
    });
  }
});

// Admission management routes (protected for institutes)
router.get('/admission/periods', auth, requireRole(['institute']), admissionController.getAdmissionPeriods);
router.post('/admission/periods', auth, requireRole(['institute']), admissionController.createAdmissionPeriod);
router.put('/admission/periods/:id', auth, requireRole(['institute']), admissionController.updateAdmissionPeriod);
router.put('/admission/periods/:id/publish', auth, requireRole(['institute']), admissionController.publishAdmissions);

// Application management routes (protected for institutes)
router.get('/applications/all', auth, requireRole(['institute']), applicationController.getInstituteApplications);
router.put('/applications/:id/status', auth, requireRole(['institute']), applicationController.updateApplicationStatus);

// Admin routes for institute management
router.post('/', auth, requireRole(['admin']), instituteController.createInstitute);
router.delete('/:id', auth, requireRole(['admin']), instituteController.deleteInstitute);

export default router;