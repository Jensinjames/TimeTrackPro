import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("Warning: SENDGRID_API_KEY environment variable is not set. Email notifications will not be sent.");
}

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
    console.warn("Email not sent: SENDGRID_API_KEY is not set");
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
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
  const subject = "Time to log your day - Daily Reminder";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Hello ${username},</h2>
      <p>This is your daily reminder to log your time for today in your time tracking dashboard.</p>
      <p>Consistently tracking your time helps you:</p>
      <ul>
        <li>Stay aware of how you're spending your time</li>
        <li>Identify patterns and areas for improvement</li>
        <li>Make progress toward your goals</li>
      </ul>
      <p style="margin-top: 30px;">
        <a href="${process.env.APP_URL || 'https://your-app-url.com'}" 
           style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Log Your Day Now
        </a>
      </p>
      <p style="margin-top: 30px; font-size: 12px; color: #666;">
        You received this email because you enabled daily reminders in your notification settings.
        <br>To update your preferences, visit the Settings page in your dashboard.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    from: 'notifications@timetracker.com',
    subject,
    html,
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
    weekStartDate: string,
    weekEndDate: string,
    topCategories: Array<{ name: string, hours: number }>,
    goalAchievement: number,
    totalHoursLogged: number
  }
): Promise<boolean> {
  const subject = "Your Weekly Time Tracking Summary";
  
  // Create the category breakdown HTML
  const categoriesHtml = weeklyData.topCategories.map(cat => 
    `<tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${cat.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${cat.hours.toFixed(1)} hours</td>
    </tr>`
  ).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Weekly Summary for ${username}</h2>
      <p>Here's an overview of your time tracking for the week of ${weeklyData.weekStartDate} to ${weeklyData.weekEndDate}:</p>
      
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Weekly Highlights</h3>
        <ul>
          <li>You tracked <strong>${weeklyData.totalHoursLogged.toFixed(1)} hours</strong> this week</li>
          <li>Goal achievement: <strong>${(weeklyData.goalAchievement * 100).toFixed(0)}%</strong></li>
        </ul>
      </div>
      
      <h3>Top Categories</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background-color: #f1f5f9;">
          <th style="text-align: left; padding: 8px;">Category</th>
          <th style="text-align: left; padding: 8px;">Hours</th>
        </tr>
        ${categoriesHtml}
      </table>
      
      <p style="margin-top: 30px;">
        <a href="${process.env.APP_URL || 'https://your-app-url.com'}/history" 
           style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          View Full Report
        </a>
      </p>
      
      <p style="margin-top: 30px; font-size: 12px; color: #666;">
        You received this email because you enabled weekly summaries in your notification settings.
        <br>To update your preferences, visit the Settings page in your dashboard.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    from: 'notifications@timetracker.com',
    subject,
    html,
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
    categoryName: string,
    goalHours: number,
    actualHours: number
  }
): Promise<boolean> {
  const subject = `Goal Achieved: ${goalData.categoryName}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Congratulations, ${username}!</h2>
      
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #22c55e;">
        <h3 style="margin-top: 0; color: #15803d;">🎯 You've achieved your goal!</h3>
        <p>You've reached your target for <strong>${goalData.categoryName}</strong>:</p>
        <ul>
          <li>Goal: ${goalData.goalHours} hours</li>
          <li>Actual: ${goalData.actualHours.toFixed(1)} hours</li>
        </ul>
      </div>
      
      <p>Keep up the great work! Consistent effort is the key to long-term success.</p>
      
      <p style="margin-top: 30px;">
        <a href="${process.env.APP_URL || 'https://your-app-url.com'}" 
           style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          View Your Dashboard
        </a>
      </p>
      
      <p style="margin-top: 30px; font-size: 12px; color: #666;">
        You received this email because you enabled goal achievement notifications in your settings.
        <br>To update your preferences, visit the Settings page in your dashboard.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    from: 'notifications@timetracker.com',
    subject,
    html,
  });
}