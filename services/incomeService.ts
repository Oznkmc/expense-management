import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Income, IncomeType } from '../types';

export const incomeService = {
  // Add a new income
  async addIncome(
    userId: string,
    amount: number,
    source: string,
    date: Date,
    isRecurring: boolean = false,
    note?: string,
    tags?: string[],
    type: IncomeType = IncomeType.OTHER,
    recurringDay?: number
  ): Promise<string> {
    const incomeData: any = {
      userId,
      amount,
      type,
      source,
      date: Timestamp.fromDate(date),
      note: note || '',
      isRecurring,
      recurringDay: recurringDay || null,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    };

    // Tags varsa ekle
    if (tags && tags.length > 0) {
      incomeData.tags = tags;
    }

    const docRef = await addDoc(collection(db, 'incomes'), incomeData);
    return docRef.id;
  },

  // Update an income
  async updateIncome(
    incomeId: string,
    data: Partial<Income>
  ): Promise<void> {
    const incomeRef = doc(db, 'incomes', incomeId);
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    };

    if (data.date) {
      updateData.date = Timestamp.fromDate(data.date);
    }

    await updateDoc(incomeRef, updateData);
  },

  // Delete an income
  async deleteIncome(incomeId: string): Promise<void> {
    await deleteDoc(doc(db, 'incomes', incomeId));
  },

  // Get incomes for a specific month
  async getMonthlyIncomes(userId: string, year: number, month: number): Promise<Income[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const q = query(
      collection(db, 'incomes'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const incomes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: (doc.data().date as Timestamp).toDate(),
      createdAt: (doc.data().createdAt as Timestamp).toDate(),
      updatedAt: (doc.data().updatedAt as Timestamp).toDate()
    } as Income));

    // Client-side filtering ve sıralama
    return incomes
      .filter(inc => inc.date >= startDate && inc.date <= endDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  // Get recurring incomes
  async getRecurringIncomes(userId: string): Promise<Income[]> {
    const q = query(
      collection(db, 'incomes'),
      where('userId', '==', userId),
      where('isRecurring', '==', true)
    );

    const snapshot = await getDocs(q);
    const incomes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: (doc.data().date as Timestamp).toDate(),
      createdAt: (doc.data().createdAt as Timestamp).toDate(),
      updatedAt: (doc.data().updatedAt as Timestamp).toDate()
    } as Income));

    // Client-side sıralama
    return incomes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // Get total income for a month
  async getMonthlyTotal(userId: string, year: number, month: number): Promise<number> {
    const incomes = await this.getMonthlyIncomes(userId, year, month);
    return incomes.reduce((sum, income) => sum + income.amount, 0);
  }
};
