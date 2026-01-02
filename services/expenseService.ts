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
  Timestamp,
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Expense, ExpenseCategory } from '../types';

export const expenseService = {
  // Add a new expense
  async addExpense(
    userId: string,
    amount: number,
    category: ExpenseCategory,
    date: Date,
    note?: string,
    imageUri?: string,
    tags?: string[]
  ): Promise<string> {
    let photoURL: string | undefined;

    // Upload image if provided
    if (imageUri) {
      photoURL = await this.uploadExpenseImage(userId, imageUri);
    }

    const expenseData: any = {
      userId,
      amount,
      category,
      date: Timestamp.fromDate(date),
      note: note || '',
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    };

    // Sadece photoURL varsa ekle
    if (photoURL) {
      expenseData.photoURL = photoURL;
    }

    // Tags varsa ekle
    if (tags && tags.length > 0) {
      expenseData.tags = tags;
    }

    const docRef = await addDoc(collection(db, 'expenses'), expenseData);
    return docRef.id;
  },

  // Upload expense image to Firebase Storage
  async uploadExpenseImage(userId: string, imageUri: string): Promise<string> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const filename = `${Date.now()}.jpg`;
      const storageRef = ref(storage, `expenses/${userId}/${filename}`);
      
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Storage upload error:', error);
      // Storage hatası durumunda boş string döndür (fotoğraf olmadan devam et)
      throw new Error('Fotoğraf yüklenemedi. Storage kurallarını kontrol edin.');
    }
  },

  // Update an expense
  async updateExpense(
    expenseId: string,
    data: Partial<Expense>
  ): Promise<void> {
    const expenseRef = doc(db, 'expenses', expenseId);
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    };

    if (data.date) {
      updateData.date = Timestamp.fromDate(data.date);
    }

    await updateDoc(expenseRef, updateData);
  },

  // Delete an expense
  async deleteExpense(expenseId: string): Promise<void> {
    await deleteDoc(doc(db, 'expenses', expenseId));
  },

  // Get expenses for a specific month
  async getMonthlyExpenses(userId: string, year: number, month: number): Promise<Expense[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Basit sorgu - index gerektirmez
    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: (doc.data().date as Timestamp).toDate(),
      createdAt: (doc.data().createdAt as Timestamp).toDate(),
      updatedAt: (doc.data().updatedAt as Timestamp).toDate()
    } as Expense));

    // Client-side filtering ve sıralama
    return expenses
      .filter(exp => exp.date >= startDate && exp.date <= endDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  // Get recent expenses
  async getRecentExpenses(userId: string, limitCount: number = 10): Promise<Expense[]> {
    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: (doc.data().date as Timestamp).toDate(),
      createdAt: (doc.data().createdAt as Timestamp).toDate(),
      updatedAt: (doc.data().updatedAt as Timestamp).toDate()
    } as Expense));

    // Client-side sıralama ve limit
    return expenses
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limitCount);
  },

  // Get expenses by category for a month
  async getCategoryExpenses(
    userId: string,
    category: ExpenseCategory,
    year: number,
    month: number
  ): Promise<Expense[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', userId),
      where('category', '==', category)
    );

    const snapshot = await getDocs(q);
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: (doc.data().date as Timestamp).toDate(),
      createdAt: (doc.data().createdAt as Timestamp).toDate(),
      updatedAt: (doc.data().updatedAt as Timestamp).toDate()
    } as Expense));

    // Client-side filtering ve sıralama
    return expenses
      .filter(exp => exp.date >= startDate && exp.date <= endDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  // Get total expenses for a month
  async getMonthlyTotal(userId: string, year: number, month: number): Promise<number> {
    const expenses = await this.getMonthlyExpenses(userId, year, month);
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }
};
