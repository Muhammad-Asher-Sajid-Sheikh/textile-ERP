import { Resend } from 'resend';
import 'dotenv/config';

const resend = new Resend(process.env.ResendAPIKey);

// Email templates
const emailTemplates = {
    accountApproved: (userName, userRole) => ({
        subject: '✅ Your TextileERP Account Has Been Approved',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">Welcome to TextileERP! 🎉</h1>
                </div>
                <div style="padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
                    <h2>Hello ${userName},</h2>
                    <p>Great news! Your account has been <strong>approved</strong> by the management team.</p>
                    
                    <div style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
                        <p><strong>Account Details:</strong></p>
                        <p><strong>Role:</strong> ${userRole}</p>
                        <p><strong>Status:</strong> Active & Approved</p>
                    </div>

                    <p>You can now log in to your account and start using TextileERP.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_LOGIN_URL || 'https://example.com/login'}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Login to Your Account
                        </a>
                    </div>

                    <p>If you have any questions, please contact our support team.</p>
                    <p>Best regards,<br><strong>TextileERP Management Team</strong></p>
                </div>
                <div style="text-align: center; padding: 15px; color: #666; font-size: 12px;">
                    <p>This is an automated message. Please do not reply directly to this email.</p>
                </div>
            </div>
        `
    }),

    accountRejected: (userName, reason) => ({
        subject: '❌ Your TextileERP Account Application - Status Update',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">Account Application Update</h1>
                </div>
                <div style="padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
                    <h2>Hello ${userName},</h2>
                    <p>Thank you for your interest in joining TextileERP. Unfortunately, your account application has been <strong>rejected</strong> by the management team.</p>
                    
                    <div style="background: white; padding: 15px; border-left: 4px solid #f5576c; margin: 20px 0;">
                        <p><strong>Reason for Rejection:</strong></p>
                        <p>${reason || 'Please contact management for more details.'}</p>
                    </div>

                    <p>If you believe this is an error or would like to reapply, please contact our management team.</p>
                    
                    <p>We appreciate your understanding.</p>
                    <p>Best regards,<br><strong>TextileERP Management Team</strong></p>
                </div>
                <div style="text-align: center; padding: 15px; color: #666; font-size: 12px;">
                    <p>This is an automated message. Please do not reply directly to this email.</p>
                </div>
            </div>
        `
    }),

    accountSuspended: (userName, reason) => ({
        subject: '⚠️ Your TextileERP Account Has Been Suspended',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: #333; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">Account Suspended</h1>
                </div>
                <div style="padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
                    <h2>Hello ${userName},</h2>
                    <p>We regret to inform you that your TextileERP account has been <strong>suspended</strong>.</p>
                    
                    <div style="background: white; padding: 15px; border-left: 4px solid #fa709a; margin: 20px 0;">
                        <p><strong>Reason:</strong></p>
                        <p>${reason || 'Contact management for more information.'}</p>
                    </div>

                    <p>If you have any questions or believe this action was made in error, please contact our management team immediately.</p>
                    
                    <p>Best regards,<br><strong>TextileERP Management Team</strong></p>
                </div>
                <div style="text-align: center; padding: 15px; color: #666; font-size: 12px;">
                    <p>This is an automated message. Please do not reply directly to this email.</p>
                </div>
            </div>
        `
    }),

    roleChanged: (userName, newRole, oldRole) => ({
        subject: '🔄 Your TextileERP Role Has Been Updated',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">Role Update</h1>
                </div>
                <div style="padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
                    <h2>Hello ${userName},</h2>
                    <p>Your role in TextileERP has been updated by management.</p>
                    
                    <div style="background: white; padding: 15px; border-left: 4px solid #4facfe; margin: 20px 0;">
                        <p><strong>Role Change:</strong></p>
                        <p><strong>Previous Role:</strong> ${oldRole}</p>
                        <p><strong>New Role:</strong> ${newRole}</p>
                    </div>

                    <p>You may have access to different features and permissions with your new role. Please log in to see the changes.</p>
                    
                    <p>If you have any questions, please contact our support team.</p>
                    <p>Best regards,<br><strong>TextileERP Management Team</strong></p>
                </div>
                <div style="text-align: center; padding: 15px; color: #666; font-size: 12px;">
                    <p>This is an automated message. Please do not reply directly to this email.</p>
                </div>
            </div>
        `
    }),

    welcomeEmail: (userName, role) => ({
        subject: '👋 Welcome to TextileERP - Registration Submitted',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">Welcome to TextileERP</h1>
                </div>
                <div style="padding: 20px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
                    <h2>Hello ${userName},</h2>
                    <p>Thank you for registering with TextileERP! Your account registration has been received and is pending approval from our management team.</p>
                    
                    <div style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
                        <p><strong>Registration Details:</strong></p>
                        <p><strong>Requested Role:</strong> ${role}</p>
                        <p><strong>Status:</strong> Pending Approval</p>
                    </div>

                    <p>We will review your request and send you an email notification once a decision has been made.</p>
                    <p>This typically takes 1-3 business days.</p>
                    
                    <p>Thank you for your patience!</p>
                    <p>Best regards,<br><strong>TextileERP Team</strong></p>
                </div>
                <div style="text-align: center; padding: 15px; color: #666; font-size: 12px;">
                    <p>This is an automated message. Please do not reply directly to this email.</p>
                </div>
            </div>
        `
    })
};

/**
 * Send account approved notification
 */
export async function sendAccountApprovedEmail(email, userName, userRole) {
    try {
        const template = emailTemplates.accountApproved(userName, userRole);
        const { data, error } = await resend.emails.send({
            from: `TextileERP <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
            to: [email],
            subject: template.subject,
            html: template.html,
        });

        if (error) {
            console.error('Error sending approval email:', error);
            throw error;
        }

        console.log('Approval email sent to:', email);
        return { success: true, data };
    } catch (error) {
        console.error('Failed to send approval email:', error);
        throw error;
    }
}

/**
 * Send account rejected notification
 */
export async function sendAccountRejectedEmail(email, userName, reason = null) {
    try {
        const template = emailTemplates.accountRejected(userName, reason);
        const { data, error } = await resend.emails.send({
            from: `TextileERP <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
            to: [email],
            subject: template.subject,
            html: template.html,
        });

        if (error) {
            console.error('Error sending rejection email:', error);
            throw error;
        }

        console.log('Rejection email sent to:', email);
        return { success: true, data };
    } catch (error) {
        console.error('Failed to send rejection email:', error);
        throw error;
    }
}

/**
 * Send account suspended notification
 */
export async function sendAccountSuspendedEmail(email, userName, reason = null) {
    try {
        const template = emailTemplates.accountSuspended(userName, reason);
        const { data, error } = await resend.emails.send({
            from: `TextileERP <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
            to: [email],
            subject: template.subject,
            html: template.html,
        });

        if (error) {
            console.error('Error sending suspended email:', error);
            throw error;
        }

        console.log('Suspension email sent to:', email);
        return { success: true, data };
    } catch (error) {
        console.error('Failed to send suspension email:', error);
        throw error;
    }
}

/**
 * Send role changed notification
 */
export async function sendRoleChangedEmail(email, userName, newRole, oldRole) {
    try {
        const template = emailTemplates.roleChanged(userName, newRole, oldRole);
        const { data, error } = await resend.emails.send({
            from: `TextileERP <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
            to: [email],
            subject: template.subject,
            html: template.html,
        });

        if (error) {
            console.error('Error sending role change email:', error);
            throw error;
        }

        console.log('Role change email sent to:', email);
        return { success: true, data };
    } catch (error) {
        console.error('Failed to send role change email:', error);
        throw error;
    }
}

/**
 * Send welcome email after registration
 */
export async function sendWelcomeEmail(email, userName, requestedRole) {
    try {
        const template = emailTemplates.welcomeEmail(userName, requestedRole);
        const { data, error } = await resend.emails.send({
            from: `TextileERP <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
            to: [email],
            subject: template.subject,
            html: template.html,
        });

        if (error) {
            console.error('Error sending welcome email:', error);
            throw error;
        }

        console.log('Welcome email sent to:', email);
        return { success: true, data };
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        throw error;
    }
}

/**
 * Legacy function - sends OTP (can be used for additional verification if needed)
 */
export async function sendOTP(sender_email, otp) {
    try {
        const { data, error } = await resend.emails.send({
            from: `TextileERP <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
            to: [sender_email],
            subject: 'Your TextileERP Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2>Your Verification Code</h2>
                    <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h1 style="color: #667eea; letter-spacing: 5px;">${otp}</h1>
                    </div>
                    <p>This code is valid for 10 minutes.</p>
                </div>
            `,
        });

        if (error) {
            console.error('Error sending OTP:', error);
            throw error;
        }

        return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
        console.error('Failed to send OTP:', error);
        throw error;
    }
}