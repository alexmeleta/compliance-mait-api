const nodemailer = require('nodemailer');

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an invitation email with the signup link
 * @param {string} to - Recipient email address
 * @param {string} inviteGuid - The unique GUID of the invitation
 * @returns {Promise} Promise that resolves when the email is sent
 */
const sendInvitationEmail = async (to, inviteGuid) => {
  try {
    console.log('Sending invitation email to:', to);
    const bcc = process.env.SMTP_BCC;
    console.log('Sending invitation email bcc:', bcc);
    const signupUrl = `${process.env.CLIENT_URL}/signup?invite=${inviteGuid}`;
    
    console.log({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Compliance Mait" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      bcc,
      subject: 'Invitation to Join Compliance Mait',
      text: `Hi,

You've been invited to join the Compliance Mait platform.

Click the link below to create your account and get started: ${signupUrl}

If you have any questions or need help, feel free to reach out to our team.

Welcome aboard!

Best regards,
The Compliance Mait Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>Hi,</p>
          <p>You've been invited to join the Compliance Mait platform.</p>
          <p style="margin: 25px 0;">
            <a href="${signupUrl}" 
               style="background-color: #4CAF50; color: white; padding: 10px 20px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Create Your Account
            </a>
          </p>
          <p>Or copy and paste this link into your browser:<br>
            <a href="${signupUrl}" style="color: #4CAF50; word-break: break-all;">${signupUrl}</a>
          </p>
          <p>If you have any questions or need help, feel free to reach out to our team.</p>
          <p>Welcome aboard!</p>
          <p>Best regards,<br>The Compliance Mait Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Invitation email sent: %s %s', info.messageId, to);
    
    return signupUrl;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
};

/**
 * Send a password reset email with reset link
 * @param {string} to - Recipient email address
 * @param {string} resetToken - The JWT token for password reset
 * @returns {Promise} Promise that resolves when the email is sent
 */
const sendPasswordResetEmail = async (to, resetToken) => {
  try {
    console.log('Sending password reset email to:', to);
    const bcc = process.env.SMTP_BCC;
    console.log('Sending password reset email bcc:', bcc);
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;
    
    const mailOptions = {
      from: `"Compliance Mait" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      bcc,
      subject: 'Password Reset Request',
      text: `Hi,

We received a request to reset your password for your Compliance Mait account.

Please click the link below to reset your password. This link will expire in 1 hour:

${resetUrl}

If you didn't request this, you can safely ignore this email.

Best regards,
The Compliance Mait Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>Hi,</p>
          <p>We received a request to reset your password for your Compliance Mait account.</p>
          <p style="margin: 25px 0;">
            <a href="${resetUrl}" 
               style="background-color: #4CAF50; color: white; padding: 10px 20px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p>Or copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #4CAF50; word-break: break-all;">${resetUrl}</a>
          </p>
          <p><small>This link will expire in 1 hour.</small></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>Best regards,<br>The Compliance Mait Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent: %s %s', info.messageId, to);
    
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendInvitationEmail,
  sendPasswordResetEmail,
};
