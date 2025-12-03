import express from 'express';
import { body, param, query } from 'express-validator';
import adminController from '../controllers/adminController.js';
import instituteController from '../controllers/instituteController.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin role
router.use(auth, requireRole(['admin']));

// System statistics
router.get('/stats', adminController.getSystemStats);

// User management
router.get('/users', adminController.getUsers);
router.put('/users/:userId/verification', adminController.manageUserVerification);

// Application management
router.get('/applications', adminController.getAllApplications);

// Institute management
router.post('/institutes', instituteController.createInstitute);
router.delete('/institutes/:id', instituteController.deleteInstitute);

export default router;