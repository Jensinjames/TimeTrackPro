// Simple test for monthly goals calculation

// Mock category with daily goal
const categoryDailyGoal = {
  id: 1,
  name: "Faith",
  color: "blue",
  icon: "fa-solid fa-church",
  goalHours: 2,
  monthlyGoalHours: 60,
  goalPeriod: "daily"
};

// Mock category with monthly goal
const categoryMonthlyGoal = {
  id: 2,
  name: "Faith",
  color: "blue",
  icon: "fa-solid fa-church", 
  goalHours: 2,
  monthlyGoalHours: 60,
  goalPeriod: "monthly"
};

// Test with 1 hour of actual time spent
const actualMinutes = 60; // 1 hour
const actualHours = actualMinutes / 60;

// Calculate progress for daily goal
function calculateProgress(category, actualHours) {
  // Calculate the target hours based on goal period
  let targetGoalHours = category.goalHours;
  
  // If using monthly goal, convert to daily equivalent for progress calculation
  if (category.goalPeriod === 'monthly' && category.monthlyGoalHours) {
    targetGoalHours = category.monthlyGoalHours / 30;
  }
  
  // Calculate progress based on the correct goal
  const progress = targetGoalHours > 0 ? (actualHours / targetGoalHours) * 100 : 0;
  
  return {
    category: category.name,
    goalPeriod: category.goalPeriod,
    actualHours,
    targetGoalHours,
    progress: Math.min(progress, 100)
  };
}

// Test results
const dailyGoalResult = calculateProgress(categoryDailyGoal, actualHours);
const monthlyGoalResult = calculateProgress(categoryMonthlyGoal, actualHours);

console.log("Daily Goal Calculation:");
console.log(dailyGoalResult);
console.log("\nMonthly Goal Calculation:");
console.log(monthlyGoalResult);

// Expected outcome:
// Daily: 1hr / 2hr daily = 50% progress
// Monthly: 1hr / (60hr/30days) = 1hr / 2hr = 50% progress