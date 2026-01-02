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
import { SavingGoal, GoalStatus } from '../types';

export const goalService = {
  async addGoal(
    userId: string,
    title: string,
    targetAmount: number,
    dueDate?: Date,
    note?: string
  ): Promise<string> {
    const goalData: any = {
      userId,
      title,
      targetAmount,
      currentAmount: 0,
      status: GoalStatus.ACTIVE,
      note: note || '',
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    };

    if (dueDate) {
      goalData.dueDate = Timestamp.fromDate(dueDate);
    }

    const docRef = await addDoc(collection(db, 'savingGoals'), goalData);
    return docRef.id;
  },

  async updateGoal(goalId: string, data: Partial<SavingGoal>): Promise<void> {
    const goalRef = doc(db, 'savingGoals', goalId);
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    };

    if (data.dueDate) {
      updateData.dueDate = Timestamp.fromDate(data.dueDate);
    }

    await updateDoc(goalRef, updateData);
  },

  async deleteGoal(goalId: string): Promise<void> {
    await deleteDoc(doc(db, 'savingGoals', goalId));
  },

  async getGoals(userId: string): Promise<SavingGoal[]> {
    const q = query(collection(db, 'savingGoals'), where('userId', '==', userId));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate() : undefined,
          createdAt: (data.createdAt as Timestamp).toDate(),
          updatedAt: (data.updatedAt as Timestamp).toDate()
        } as SavingGoal;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
};
