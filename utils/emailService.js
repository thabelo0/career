const nodemailer = require('nodemailer');

// Create transporter (using Gmail as example)
const transporter = nodemailer.createTransporter({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const emailService = {
  // Send verification email
  sendVerificationEmail: async (email, verificationToken) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email - Career Guidance Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3498db;">Welcome to Career Guidance Platform!</h2>
          <p>Please verify your email address to complete your registration.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #3498db; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link in your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Verification email sent to: ${email}`);
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  },

  // Send password reset email
  sendPasswordResetEmail: async (email, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Reset Your Password - Career Guidance Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3498db;">Password Reset Request</h2>
          <p>You requested to reset your password. Click the button below to proceed.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #e74c3c; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to: ${email}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
};

module.exports = emailService;