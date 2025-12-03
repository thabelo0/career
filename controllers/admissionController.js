import { pool } from '../config/database.js';
import { validationResult } from 'express-validator';

const admissionController = {
  // Get admission periods for institute
  getAdmissionPeriods: async (req, res) => {
    try {
      const instituteId = req.user.profile.id;
      const { status } = req.query;

      let query = `
        SELECT ap.*, COUNT(a.id) as total_applications
        FROM admission_periods ap
        LEFT JOIN applications a ON ap.id = a.admission_period_id
        WHERE ap.institute_id = ?
      `;
      const params = [instituteId];

      if (status) {
        query += ' AND ap.status = ?';
        params.push(status);
      }

      query += ' GROUP BY ap.id ORDER BY ap.start_date DESC';

      const [periods] = await pool.execute(query, params);

      res.json({
        success: true,
        data: periods
      });

    } catch (error) {
      console.error('Get admission periods error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch admission periods'
      });
    }
  },

  // Create admission period
  createAdmissionPeriod: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const instituteId = req.user.profile.id;
      const { name, start_date, end_date } = req.body;

      // Validate dates
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      
      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }

      if (startDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Start date cannot be in the past'
        });
      }

      // Check for overlapping admission periods
      const [overlapping] = await pool.execute(
        `SELECT id FROM admission_periods 
         WHERE institute_id = ? AND status != 'closed' 
         AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (start_date <= ? AND end_date >= ?))`,
        [instituteId, start_date, end_date, start_date, end_date, start_date, end_date]
      );

      if (overlapping.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Admission period overlaps with existing active period'
        });
      }

      // Determine status based on start date
      let status = 'upcoming';
      if (startDate <= new Date() && endDate >= new Date()) {
        status = 'active';
      }

      const [result] = await pool.execute(
        `INSERT INTO admission_periods (institute_id, name, start_date, end_date, status) 
         VALUES (?, ?, ?, ?, ?)`,
        [instituteId, name, start_date, end_date, status]
      );

      res.status(201).json({
        success: true,
        message: 'Admission period created successfully',
        data: {
          id: result.insertId,
          name,
          start_date,
          end_date,
          status
        }
      });

    } catch (error) {
      console.error('Create admission period error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create admission period'
      });
    }
  },

  // Update admission period
  updateAdmissionPeriod: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const instituteId = req.user.profile.id;
      const { status } = req.body;

      // Verify admission period belongs to institute
      const [periods] = await pool.execute(
        'SELECT * FROM admission_periods WHERE id = ? AND institute_id = ?',
        [id, instituteId]
      );

      if (periods.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Admission period not found'
        });
      }

      const period = periods[0];

      // Validate status transition
      if (status === 'closed' && period.status === 'active') {
        // Close admission period and reject pending applications
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
          // Update admission period status
          await connection.execute(
            'UPDATE admission_periods SET status = ? WHERE id = ?',
            [status, id]
          );

          // Reject all pending applications for this period
          await connection.execute(
            `UPDATE applications 
             SET status = 'rejected', review_notes = 'Application rejected: Admission period closed'
             WHERE admission_period_id = ? AND status = 'pending'`,
            [id]
          );

          await connection.commit();
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      } else {
        // Simple status update
        await pool.execute(
          'UPDATE admission_periods SET status = ? WHERE id = ?',
          [status, id]
        );
      }

      res.json({
        success: true,
        message: 'Admission period updated successfully'
      });

    } catch (error) {
      console.error('Update admission period error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update admission period'
      });
    }
  },

  // Publish admissions (set status to active)
  publishAdmissions: async (req, res) => {
    try {
      const { id } = req.params;
      const instituteId = req.user.profile.id;

      // Verify admission period belongs to institute
      const [periods] = await pool.execute(
        'SELECT * FROM admission_periods WHERE id = ? AND institute_id = ?',
        [id, instituteId]
      );

      if (periods.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Admission period not found'
        });
      }

      const period = periods[0];

      if (period.status !== 'upcoming') {
        return res.status(400).json({
          success: false,
          message: 'Only upcoming admission periods can be published'
        });
      }

      if (new Date(period.start_date) > new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot publish admission period before start date'
        });
      }

      await pool.execute(
        'UPDATE admission_periods SET status = "active" WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Admissions published successfully'
      });

    } catch (error) {
      console.error('Publish admissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to publish admissions'
      });
    }
  }
};

export default admissionController;