import express from 'express';
import { body, param } from 'express-validator';
import studentController from '../controllers/studentController.js';
import courseController from '../controllers/courseController.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const profileValidation = [
  body('date_of_birth').optional().isDate(),
  body('phone').optional().isLength({ max: 20 }),
  body('high_school').optional().isLength({ max: 255 }),
  body('graduation_year').optional().isInt({ min: 1900, max: 2100 }),
  body('grades').optional().isObject()
];

// Routes
router.get('/profile', auth, requireRole(['student']), studentController.getProfile);
router.put('/profile', auth, requireRole(['student']), profileValidation, studentController.updateProfile);
router.get('/courses/:courseId/eligibility', auth, requireRole(['student']), courseController.checkEligibility);

export default router;