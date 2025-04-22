import { MailService } from '@sendgrid/mail';

// Check for SendGrid API key
if (!process.env.SENDGRID_API_KEY) {
  console.warn("Warning: SENDGRID_API_KEY environment variable is not set. Email functionality will be disabled.");
}

// Create mail service instance
const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Sends an email using SendGrid
 * @param params Email parameters
 * @returns A promise that resolves to a boolean indicating success
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("Cannot send email: SENDGRID_API_KEY not set");
    return false;
  }

  try {
    const fromEmail: string = params.from || 'noreply@timetracker.app';
    // Ensure all required fields are strings
    await mailService.send({
      to: params.to,
      from: fromEmail,
      subject: params.subject || '',
      text: params.text || '',
      html: params.html || '',
    });
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Sends a daily reminder email to the user
 * @param to User's email address
 * @param username User's name or username
 * @returns A promise that resolves to a boolean indicating success
 */
export async function sendDailyReminder(to: string, username: string): Promise<boolean> {
  const subject = 'Time Tracker - Daily Reminder';
  const text = `Hello ${username},\n\nThis is your daily reminder to log your time for today and track your productivity.\n\nBest regards,\nTime Tracker Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a6ee0;">Time Tracker - Daily Reminder</h2>
      <p>Hello ${username},</p>
      <p>This is your daily reminder to log your time for today and track your productivity.</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="https://timetracker.app/dashboard" style="background-color: #4a6ee0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Go to Dashboard</a>
      </div>
      <p>Stay productive!</p>
      <p>Best regards,<br>Time Tracker Team</p>
    </div>
  `;

  return sendEmail({
    to,
    from: 'noreply@timetracker.app',
    subject,
    text,
    html
  });
}

/**
 * Sends a weekly summary email to the user
 * @param to User's email address
 * @param username User's name or username
 * @param weeklyData Data about the user's week
 * @returns A promise that resolves to a boolean indicating success
 */
export async function sendWeeklySummary(
  to: string, 
  username: string, 
  weeklyData: {
    averageDailyScore: number;
    topCategory: string;
    topCategoryHours: number;
    totalTrackedHours: number;
    unaccountedHours: number;
  }
): Promise<boolean> {
  const subject = 'Time Tracker - Your Weekly Summary';
  
  const text = `Hello ${username},\n\n
Here's your weekly productivity summary:
- Average Daily Score: ${weeklyData.averageDailyScore.toFixed(1)}/10
- Top Category: ${weeklyData.topCategory} (${weeklyData.topCategoryHours.toFixed(1)} hours)
- Total Tracked Time: ${weeklyData.totalTrackedHours.toFixed(1)} hours
- Unaccounted Time: ${weeklyData.unaccountedHours.toFixed(1)} hours\n\n
Keep up the good work!\n\n
Best regards,\nTime Tracker Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a6ee0;">Time Tracker - Your Weekly Summary</h2>
      <p>Hello ${username},</p>
      <p>Here's your weekly productivity summary:</p>
      
      <div style="background-color: #f5f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <div style="margin-bottom: 15px;">
          <span style="font-weight: bold; color: #4a6ee0;">Average Daily Score:</span> 
          <span style="font-size: 18px;">${weeklyData.averageDailyScore.toFixed(1)}/10</span>
        </div>
        <div style="margin-bottom: 15px;">
          <span style="font-weight: bold; color: #4a6ee0;">Top Category:</span> 
          <span style="font-size: 18px;">${weeklyData.topCategory} (${weeklyData.topCategoryHours.toFixed(1)} hours)</span>
        </div>
        <div style="margin-bottom: 15px;">
          <span style="font-weight: bold; color: #4a6ee0;">Total Tracked Time:</span> 
          <span style="font-size: 18px;">${weeklyData.totalTrackedHours.toFixed(1)} hours</span>
        </div>
        <div>
          <span style="font-weight: bold; color: #4a6ee0;">Unaccounted Time:</span> 
          <span style="font-size: 18px;">${weeklyData.unaccountedHours.toFixed(1)} hours</span>
        </div>
      </div>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="https://timetracker.app/dashboard" style="background-color: #4a6ee0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Full Report</a>
      </div>
      
      <p>Keep up the good work!</p>
      <p>Best regards,<br>Time Tracker Team</p>
    </div>
  `;

  return sendEmail({
    to,
    from: 'noreply@timetracker.app',
    subject,
    text,
    html
  });
}

/**
 * Sends a notification when a user reaches a goal
 * @param to User's email address
 * @param username User's name or username
 * @param goalData Data about the achieved goal
 * @returns A promise that resolves to a boolean indicating success
 */
export async function sendGoalAchievement(
  to: string, 
  username: string, 
  goalData: {
    category: string;
    targetHours: number;
    actualHours: number;
    date: Date;
  }
): Promise<boolean> {
  const subject = 'Time Tracker - Goal Achievement';
  const formattedDate = goalData.date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const text = `Hello ${username},\n\n
Congratulations! You've achieved your time goal for ${goalData.category}.\n
Target: ${goalData.targetHours.toFixed(1)} hours
Actual: ${goalData.actualHours.toFixed(1)} hours
Date: ${formattedDate}\n\n
Keep up the great work!\n\n
Best regards,\nTime Tracker Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a6ee0;">Goal Achievement</h2>
      <p>Hello ${username},</p>
      <p style="font-size: 18px;">🎉 <strong>Congratulations!</strong> 🎉</p>
      <p>You've achieved your time goal for <strong>${goalData.category}</strong>.</p>
      
      <div style="background-color: #f5f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <div style="margin-bottom: 15px;">
          <span style="font-weight: bold; color: #4a6ee0;">Target:</span> 
          <span style="font-size: 18px;">${goalData.targetHours.toFixed(1)} hours</span>
        </div>
        <div style="margin-bottom: 15px;">
          <span style="font-weight: bold; color: #4a6ee0;">Actual:</span> 
          <span style="font-size: 18px;">${goalData.actualHours.toFixed(1)} hours</span>
        </div>
        <div>
          <span style="font-weight: bold; color: #4a6ee0;">Date:</span> 
          <span style="font-size: 18px;">${formattedDate}</span>
        </div>
      </div>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="https://timetracker.app/dashboard" style="background-color: #4a6ee0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Dashboard</a>
      </div>
      
      <p>Keep up the great work!</p>
      <p>Best regards,<br>Time Tracker Team</p>
    </div>
  `;

  return sendEmail({
    to,
    from: 'noreply@timetracker.app',
    subject,
    text,
    html
  });
}