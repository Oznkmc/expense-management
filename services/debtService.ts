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
import { DebtNote, DebtDirection, DebtStatus } from '../types';

export const debtService = {
  // Add a new debt/IOU note
  async addDebt(
    userId: string,
    counterparty: string,
    amount: number,
    direction: DebtDirection,
    note?: string,
    dueDate?: Date
  ): Promise<string> {
    const debtData: any = {
      userId,
      counterparty,
      amount,
      direction,
      note: note || '',
      status: DebtStatus.OPEN,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    };

    if (dueDate) {
      debtData.dueDate = Timestamp.fromDate(dueDate);
    }

    const docRef = await addDoc(collection(db, 'debts'), debtData);
    return docRef.id;
  },

  // Update existing debt note
  async updateDebt(
    debtId: string,
    data: Partial<DebtNote>
  ): Promise<void> {
    const debtRef = doc(db, 'debts', debtId);
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    };

    if (data.dueDate) {
      updateData.dueDate = Timestamp.fromDate(data.dueDate);
    }

    await updateDoc(debtRef, updateData);
  },

  async deleteDebt(debtId: string): Promise<void> {
    await deleteDoc(doc(db, 'debts', debtId));
  },

  // Get all debts for user (optionally filter by status)
  async getDebts(userId: string, status?: DebtStatus): Promise<DebtNote[]> {
    const q = query(
      collection(db, 'debts'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const debts = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate() : undefined,
        createdAt: (data.createdAt as Timestamp).toDate(),
        updatedAt: (data.updatedAt as Timestamp).toDate()
      } as DebtNote;
    });

    const filtered = status ? debts.filter(d => d.status === status) : debts;

    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
};
