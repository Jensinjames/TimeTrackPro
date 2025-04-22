import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the file
const filePath = path.join(process.cwd(), 'server/storage.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Define the old and new code
const oldCode = `      const actualHours = actualMinutes / 60;
      const progress = category.goalHours > 0 ? (actualHours / category.goalHours) * 100 : 0;`;

const newCode = `      const actualHours = actualMinutes / 60;
      
      // Calculate the target hours based on goal period
      let targetGoalHours = category.goalHours;
      
      // If using monthly goal, convert to daily equivalent for progress calculation
      if (category.goalPeriod === 'monthly' && category.monthlyGoalHours) {
        targetGoalHours = category.monthlyGoalHours / 30;
      }
      
      // Calculate progress based on the correct goal
      const progress = targetGoalHours > 0 ? (actualHours / targetGoalHours) * 100 : 0;`;

// Replace the code
const updatedContent = content.replace(oldCode, newCode);

// Write the file back
fs.writeFileSync(filePath, updatedContent, 'utf8');

console.log('DatabaseStorage.getDashboardData method updated successfully.');