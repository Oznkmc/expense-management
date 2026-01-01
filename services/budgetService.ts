import { expenseService } from './expenseService';
import { incomeService } from './incomeService';
import { 
  BudgetSummary, 
  MainCategory, 
  getMainCategory,
  MonthlyReport,
  Expense
} from '../types';

export const budgetService = {
  // Calculate budget summary for current month
  async getBudgetSummary(
    userId: string,
    monthlyBudget: number
  ): Promise<BudgetSummary> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Get expenses and incomes
    const expenses = await expenseService.getMonthlyExpenses(userId, year, month);
    const incomes = await incomeService.getMonthlyIncomes(userId, year, month);

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);

    // Calculate category expenses
    const categoryExpenses: Record<MainCategory, number> = {
      [MainCategory.FOOD]: 0,
      [MainCategory.TRANSPORT]: 0,
      [MainCategory.EDUCATION]: 0,
      [MainCategory.ENTERTAINMENT]: 0,
      [MainCategory.CLOTHING]: 0,
      [MainCategory.COMMUNICATION]: 0,
      [MainCategory.HEALTH]: 0,
      [MainCategory.OTHER]: 0
    };

    expenses.forEach(expense => {
      const mainCategory = getMainCategory(expense.category);
      categoryExpenses[mainCategory] += expense.amount;
    });

    // Calculate remaining days in month
    const lastDay = new Date(year, month, 0).getDate();
    const currentDay = now.getDate();
    const daysLeft = lastDay - currentDay + 1;

    // Calculate daily average needed
    const totalAvailable = monthlyBudget + totalIncome;
    const remaining = totalAvailable - totalExpenses;
    const dailyAverage = daysLeft > 0 ? remaining / daysLeft : 0;

    return {
      totalBudget: monthlyBudget,
      totalExpenses,
      totalIncome,
      remaining,
      daysLeft,
      dailyAverage,
      categoryExpenses
    };
  },

  // Get monthly report
  async getMonthlyReport(
    userId: string,
    year: number,
    month: number
  ): Promise<MonthlyReport> {
    const expenses = await expenseService.getMonthlyExpenses(userId, year, month);
    const incomes = await incomeService.getMonthlyIncomes(userId, year, month);

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);

    // Category breakdown
    const categoryBreakdown: Record<MainCategory, number> = {
      [MainCategory.FOOD]: 0,
      [MainCategory.TRANSPORT]: 0,
      [MainCategory.EDUCATION]: 0,
      [MainCategory.ENTERTAINMENT]: 0,
      [MainCategory.CLOTHING]: 0,
      [MainCategory.COMMUNICATION]: 0,
      [MainCategory.HEALTH]: 0,
      [MainCategory.OTHER]: 0
    };

    expenses.forEach(expense => {
      const mainCategory = getMainCategory(expense.category);
      categoryBreakdown[mainCategory] += expense.amount;
    });

    // Daily expenses (use local date to avoid timezone shifting a day back)
    const dailyExpenses: Record<string, number> = {};
    expenses.forEach(expense => {
      const dateKey = `${expense.date.getFullYear()}-${(expense.date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${expense.date.getDate().toString().padStart(2, '0')}`;
      dailyExpenses[dateKey] = (dailyExpenses[dateKey] || 0) + expense.amount;
    });

    // Top 10 expenses
    const topExpenses = [...expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return {
      month: `${year}-${month.toString().padStart(2, '0')}`,
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      categoryBreakdown,
      dailyExpenses,
      topExpenses
    };
  },

  // Compare current month with previous month
  async compareMonths(userId: string): Promise<{
    current: MonthlyReport;
    previous: MonthlyReport;
    expenseChange: number;
    incomeChange: number;
  }> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let previousYear = currentYear;
    let previousMonth = currentMonth - 1;
    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear -= 1;
    }

    const current = await this.getMonthlyReport(userId, currentYear, currentMonth);
    const previous = await this.getMonthlyReport(userId, previousYear, previousMonth);

    const expenseChange = previous.totalExpenses > 0
      ? ((current.totalExpenses - previous.totalExpenses) / previous.totalExpenses) * 100
      : 0;

    const incomeChange = previous.totalIncome > 0
      ? ((current.totalIncome - previous.totalIncome) / previous.totalIncome) * 100
      : 0;

    return {
      current,
      previous,
      expenseChange,
      incomeChange
    };
  },

  // Get spending trend (last 6 months)
  async getSpendingTrend(userId: string): Promise<{
    months: string[];
    expenses: number[];
    incomes: number[];
  }> {
    const now = new Date();
    const months: string[] = [];
    const expenses: number[] = [];
    const incomes: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
      months.push(monthStr);

      const monthExpenses = await expenseService.getMonthlyTotal(userId, year, month);
      const monthIncomes = await incomeService.getMonthlyTotal(userId, year, month);

      expenses.push(monthExpenses);
      incomes.push(monthIncomes);
    }

    return { months, expenses, incomes };
  }
};
