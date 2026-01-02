import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { CategoryBudget, MainCategory } from '../types';

export const categoryBudgetService = {
  // Set or update budget limit for a category in a specific month
  async setCategoryBudget(
    userId: string,
    category: MainCategory,
    limit: number,
    year: number,
    month: number
  ): Promise<void> {
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    const docId = `${userId}_${category}_${monthStr}`;

    const budgetData = {
      userId,
      category,
      limit,
      month: monthStr,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    };

    await setDoc(doc(db, 'categoryBudgets', docId), budgetData);
  },

  // Delete budget limit for a category
  async deleteCategoryBudget(
    userId: string,
    category: MainCategory,
    year: number,
    month: number
  ): Promise<void> {
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    const docId = `${userId}_${category}_${monthStr}`;
    await deleteDoc(doc(db, 'categoryBudgets', docId));
  },

  // Get all budget limits for a specific month
  async getMonthlyBudgets(
    userId: string,
    year: number,
    month: number
  ): Promise<CategoryBudget[]> {
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;

    const q = query(
      collection(db, 'categoryBudgets'),
      where('userId', '==', userId),
      where('month', '==', monthStr)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: (docSnap.data().createdAt as Timestamp).toDate(),
      updatedAt: (docSnap.data().updatedAt as Timestamp).toDate()
    } as CategoryBudget));
  },

  // Get budget limit for a specific category
  async getCategoryBudget(
    userId: string,
    category: MainCategory,
    year: number,
    month: number
  ): Promise<CategoryBudget | null> {
    const budgets = await this.getMonthlyBudgets(userId, year, month);
    return budgets.find(b => b.category === category) || null;
  }
};
