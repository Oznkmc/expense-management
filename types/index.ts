export interface User {
  uid: string;
  email: string;
  displayName: string;
  monthlyBudget: number;
  createdAt: Date;
  photoURL?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  monthlyBudget: number;
  email: string;
  photoURL?: string;
  setupCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum ExpenseCategory {
  FOOD_CANTEEN = 'food_canteen',
  FOOD_RESTAURANT = 'food_restaurant',
  FOOD_MARKET = 'food_market',
  TRANSPORT_BUS = 'transport_bus',
  TRANSPORT_TAXI = 'transport_taxi',
  TRANSPORT_FUEL = 'transport_fuel',
  EDUCATION_BOOKS = 'education_books',
  EDUCATION_STATIONERY = 'education_stationery',
  EDUCATION_PHOTOCOPY = 'education_photocopy',
  ENTERTAINMENT_CINEMA = 'entertainment_cinema',
  ENTERTAINMENT_CAFE = 'entertainment_cafe',
  ENTERTAINMENT_SOCIAL = 'entertainment_social',
  CLOTHING = 'clothing',
  COMMUNICATION_INTERNET = 'communication_internet',
  COMMUNICATION_PHONE = 'communication_phone',
  HEALTH = 'health',
  OTHER = 'other'
}

export const CategoryIcons: Record<ExpenseCategory, string> = {
  [ExpenseCategory.FOOD_CANTEEN]: '🍽️',
  [ExpenseCategory.FOOD_RESTAURANT]: '🍽️',
  [ExpenseCategory.FOOD_MARKET]: '🛒',
  [ExpenseCategory.TRANSPORT_BUS]: '🚌',
  [ExpenseCategory.TRANSPORT_TAXI]: '🚕',
  [ExpenseCategory.TRANSPORT_FUEL]: '⛽',
  [ExpenseCategory.EDUCATION_BOOKS]: '📚',
  [ExpenseCategory.EDUCATION_STATIONERY]: '✏️',
  [ExpenseCategory.EDUCATION_PHOTOCOPY]: '📄',
  [ExpenseCategory.ENTERTAINMENT_CINEMA]: '🎬',
  [ExpenseCategory.ENTERTAINMENT_CAFE]: '☕',
  [ExpenseCategory.ENTERTAINMENT_SOCIAL]: '🎮',
  [ExpenseCategory.CLOTHING]: '👕',
  [ExpenseCategory.COMMUNICATION_INTERNET]: '📶',
  [ExpenseCategory.COMMUNICATION_PHONE]: '📱',
  [ExpenseCategory.HEALTH]: '🏥',
  [ExpenseCategory.OTHER]: '💰'
};

export const CategoryNames: Record<ExpenseCategory, string> = {
  [ExpenseCategory.FOOD_CANTEEN]: 'Kantinde Yemek',
  [ExpenseCategory.FOOD_RESTAURANT]: 'Dışarıda Yemek',
  [ExpenseCategory.FOOD_MARKET]: 'Market',
  [ExpenseCategory.TRANSPORT_BUS]: 'Otobüs',
  [ExpenseCategory.TRANSPORT_TAXI]: 'Taksi',
  [ExpenseCategory.TRANSPORT_FUEL]: 'Yakıt',
  [ExpenseCategory.EDUCATION_BOOKS]: 'Kitap',
  [ExpenseCategory.EDUCATION_STATIONERY]: 'Kırtasiye',
  [ExpenseCategory.EDUCATION_PHOTOCOPY]: 'Fotokopi',
  [ExpenseCategory.ENTERTAINMENT_CINEMA]: 'Sinema',
  [ExpenseCategory.ENTERTAINMENT_CAFE]: 'Kafe',
  [ExpenseCategory.ENTERTAINMENT_SOCIAL]: 'Sosyal Aktivite',
  [ExpenseCategory.CLOTHING]: 'Giyim',
  [ExpenseCategory.COMMUNICATION_INTERNET]: 'İnternet',
  [ExpenseCategory.COMMUNICATION_PHONE]: 'Telefon',
  [ExpenseCategory.HEALTH]: 'Sağlık',
  [ExpenseCategory.OTHER]: 'Diğer'
};

export enum MainCategory {
  FOOD = 'food',
  TRANSPORT = 'transport',
  EDUCATION = 'education',
  ENTERTAINMENT = 'entertainment',
  CLOTHING = 'clothing',
  COMMUNICATION = 'communication',
  HEALTH = 'health',
  OTHER = 'other'
}

export const MainCategoryNames: Record<MainCategory, string> = {
  [MainCategory.FOOD]: '🍽️ Yemek',
  [MainCategory.TRANSPORT]: '🚌 Ulaşım',
  [MainCategory.EDUCATION]: '📚 Eğitim',
  [MainCategory.ENTERTAINMENT]: '🎮 Eğlence',
  [MainCategory.CLOTHING]: '👕 Giyim',
  [MainCategory.COMMUNICATION]: '📱 İletişim',
  [MainCategory.HEALTH]: '🏥 Sağlık',
  [MainCategory.OTHER]: '💰 Diğer'
};

export function getMainCategory(category: ExpenseCategory): MainCategory {
  if (category.startsWith('food_')) return MainCategory.FOOD;
  if (category.startsWith('transport_')) return MainCategory.TRANSPORT;
  if (category.startsWith('education_')) return MainCategory.EDUCATION;
  if (category.startsWith('entertainment_')) return MainCategory.ENTERTAINMENT;
  if (category.startsWith('communication_')) return MainCategory.COMMUNICATION;
  if (category === ExpenseCategory.CLOTHING) return MainCategory.CLOTHING;
  if (category === ExpenseCategory.HEALTH) return MainCategory.HEALTH;
  return MainCategory.OTHER;
}

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: ExpenseCategory;
  date: Date;
  note?: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum IncomeType {
  ALLOWANCE = 'allowance',
  SCHOLARSHIP = 'scholarship',
  PART_TIME = 'part_time',
  OTHER = 'other'
}

export const IncomeTypeNames: Record<IncomeType, string> = {
  [IncomeType.ALLOWANCE]: '💵 Harçlık',
  [IncomeType.SCHOLARSHIP]: '🎓 Burs',
  [IncomeType.PART_TIME]: '💼 Part-time İş',
  [IncomeType.OTHER]: '💰 Diğer'
};

export interface Income {
  id: string;
  userId: string;
  amount: number;
  type: IncomeType;
  source: string; // Açık metin: "Maaş", "Harçlık", "Freelance" vb.
  date: Date;
  note?: string;
  isRecurring: boolean;
  recurringDay?: number; // Day of month (1-31)
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryBudget {
  id: string;
  userId: string;
  category: MainCategory;
  limit: number;
  month: string; // Format: YYYY-MM
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetSummary {
  totalBudget: number;
  totalExpenses: number;
  totalIncome: number;
  remaining: number;
  daysLeft: number;
  dailyAverage: number;
  categoryExpenses: Record<MainCategory, number>;
}

export interface MonthlyReport {
  month: string; // Format: YYYY-MM
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  categoryBreakdown: Record<MainCategory, number>;
  dailyExpenses: Record<string, number>; // Date -> Amount
  topExpenses: Expense[];
}

export enum DebtDirection {
  OWING = 'owing', // I owe someone
  OWED = 'owed'    // Someone owes me
}

export enum DebtStatus {
  OPEN = 'open',
  PAID = 'paid'
}

export const DebtDirectionLabels: Record<DebtDirection, string> = {
  [DebtDirection.OWING]: 'Borcum',
  [DebtDirection.OWED]: 'Alacağım'
};

export interface DebtNote {
  id: string;
  userId: string;
  counterparty: string; // Ahmet, Ayşe vb.
  amount: number;
  direction: DebtDirection;
  note?: string;
  status: DebtStatus;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum GoalStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface SavingGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  status: GoalStatus;
  dueDate?: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum RecurringFrequency {
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
  YEARLY = 'yearly'
}

export const RecurringFrequencyNames: Record<RecurringFrequency, string> = {
  [RecurringFrequency.MONTHLY]: 'Aylık',
  [RecurringFrequency.WEEKLY]: 'Haftalık',
  [RecurringFrequency.YEARLY]: 'Yıllık'
};

export enum RecurringStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled'
}

export interface RecurringExpense {
  id: string;
  userId: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  frequency: RecurringFrequency;
  dayOfMonth?: number; // 1-31 for monthly
  dayOfWeek?: number; // 0-6 for weekly (0=Sunday)
  monthOfYear?: number; // 1-12 for yearly
  status: RecurringStatus;
  nextDate: Date;
  lastProcessedDate?: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}
