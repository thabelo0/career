import express from 'express';
import { body } from 'express-validator';
import authController from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('userType').isIn(['student', 'institute']).withMessage('Valid user type is required')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('userType').isIn(['student', 'institute', 'admin']).withMessage('Valid user type is required')
];

// Routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/forgot-password', authController.requestPasswordReset);
router.get('/me', auth, authController.getMe);

export default router;