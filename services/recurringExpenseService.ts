import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { RecurringExpense, RecurringFrequency, RecurringStatus, ExpenseCategory } from '../types';
import { expenseService } from './expenseService';

export const recurringExpenseService = {
  // Add a new recurring expense
  async addRecurringExpense(
    userId: string,
    title: string,
    amount: number,
    category: ExpenseCategory,
    frequency: RecurringFrequency,
    dayOfMonth?: number,
    dayOfWeek?: number,
    monthOfYear?: number,
    note?: string
  ): Promise<string> {
    const nextDate = this.calculateNextDate(frequency, dayOfMonth, dayOfWeek, monthOfYear);

    const recurringData: any = {
      userId,
      title,
      amount,
      category,
      frequency,
      status: RecurringStatus.ACTIVE,
      nextDate: Timestamp.fromDate(nextDate),
      note: note || '',
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    };

    if (dayOfMonth) recurringData.dayOfMonth = dayOfMonth;
    if (dayOfWeek !== undefined) recurringData.dayOfWeek = dayOfWeek;
    if (monthOfYear) recurringData.monthOfYear = monthOfYear;

    const docRef = await addDoc(collection(db, 'recurringExpenses'), recurringData);
    return docRef.id;
  },

  // Calculate next occurrence date
  calculateNextDate(
    frequency: RecurringFrequency,
    dayOfMonth?: number,
    dayOfWeek?: number,
    monthOfYear?: number
  ): Date {
    const now = new Date();
    let nextDate = new Date(now);

    switch (frequency) {
      case RecurringFrequency.MONTHLY:
        if (dayOfMonth) {
          nextDate.setDate(dayOfMonth);
          // If we've passed this month's date, move to next month
          if (nextDate <= now) {
            nextDate.setMonth(nextDate.getMonth() + 1);
          }
        }
        break;

      case RecurringFrequency.WEEKLY:
        if (dayOfWeek !== undefined) {
          const currentDay = now.getDay();
          const daysUntilNext = (dayOfWeek - currentDay + 7) % 7;
          nextDate.setDate(now.getDate() + (daysUntilNext || 7));
        }
        break;

      case RecurringFrequency.YEARLY:
        if (monthOfYear && dayOfMonth) {
          nextDate.setMonth(monthOfYear - 1);
          nextDate.setDate(dayOfMonth);
          // If we've passed this year's date, move to next year
          if (nextDate <= now) {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
          }
        }
        break;
    }

    return nextDate;
  },

  // Update recurring expense
  async updateRecurringExpense(
    id: string,
    data: Partial<RecurringExpense>
  ): Promise<void> {
    const docRef = doc(db, 'recurringExpenses', id);
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    };

    if (data.nextDate) {
      updateData.nextDate = Timestamp.fromDate(data.nextDate);
    }

    if (data.lastProcessedDate) {
      updateData.lastProcessedDate = Timestamp.fromDate(data.lastProcessedDate);
    }

    await updateDoc(docRef, updateData);
  },

  // Delete recurring expense
  async deleteRecurringExpense(id: string): Promise<void> {
    await deleteDoc(doc(db, 'recurringExpenses', id));
  },

  // Get all recurring expenses for user
  async getRecurringExpenses(userId: string, status?: RecurringStatus): Promise<RecurringExpense[]> {
    const q = query(
      collection(db, 'recurringExpenses'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const expenses = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        nextDate: (data.nextDate as Timestamp).toDate(),
        lastProcessedDate: data.lastProcessedDate ? (data.lastProcessedDate as Timestamp).toDate() : undefined,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate()
      } as RecurringExpense;
    });

    const filtered = status ? expenses.filter(e => e.status === status) : expenses;
    return filtered.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  },

  // Process recurring expenses (create actual expense entries)
  async processRecurringExpense(recurring: RecurringExpense): Promise<void> {
    // Create actual expense
    await expenseService.addExpense(
      recurring.userId,
      recurring.amount,
      recurring.category,
      new Date(),
      `${recurring.title} (Otomatik)`
    );

    // Calculate next date
    const nextDate = this.getNextOccurrence(recurring);

    // Update recurring expense
    await this.updateRecurringExpense(recurring.id, {
      nextDate,
      lastProcessedDate: new Date()
    });
  },

  // Get next occurrence based on frequency
  getNextOccurrence(recurring: RecurringExpense): Date {
    const current = new Date(recurring.nextDate);
    let nextDate = new Date(current);

    switch (recurring.frequency) {
      case RecurringFrequency.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;

      case RecurringFrequency.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7);
        break;

      case RecurringFrequency.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    return nextDate;
  },

  // Get upcoming recurring expenses (within next 7 days)
  async getUpcomingExpenses(userId: string): Promise<RecurringExpense[]> {
    const allRecurring = await this.getRecurringExpenses(userId, RecurringStatus.ACTIVE);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return allRecurring.filter(r => r.nextDate <= sevenDaysFromNow);
  }
};
