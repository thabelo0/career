import express from 'express';
import { body, param, query } from 'express-validator';
import applicationController from '../controllers/applicationController.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const applyValidation = [
  body('courseId').isInt().withMessage('Valid course ID is required'),
  body('preferredMajor').optional().isLength({ max: 255 }),
  body('personalStatement').isLength({ min: 50 }).withMessage('Personal statement must be at least 50 characters'),
  body('documents').optional().isArray()
];

const statusValidation = [
  body('status').isIn(['pending', 'under_review', 'accepted', 'rejected']).withMessage('Valid status is required'),
  body('reviewNotes').optional().isLength({ max: 1000 })
];

// Routes
router.post('/apply', auth, requireRole(['student']), applyValidation, applicationController.applyToCourse);
router.get('/student', auth, requireRole(['student']), applicationController.getStudentApplications);
router.get('/institute', auth, requireRole(['institute']), applicationController.getInstituteApplications);
router.put('/:applicationId/status', auth, requireRole(['institute']), statusValidation, applicationController.updateApplicationStatus);
router.delete('/:applicationId/withdraw', auth, requireRole(['student']), applicationController.withdrawApplication);

export default router;