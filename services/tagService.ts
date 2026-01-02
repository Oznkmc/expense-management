import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { Tag } from '../types';

export const tagService = {
  // Add new tag
  async addTag(
    userId: string,
    name: string,
    color: string,
    icon?: string
  ): Promise<string> {
    const tagData = {
      userId,
      name: name.trim(),
      color,
      icon: icon || '',
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    };

    const docRef = await addDoc(collection(db, 'tags'), tagData);
    return docRef.id;
  },

  // Update tag
  async updateTag(
    tagId: string,
    data: Partial<Tag>
  ): Promise<void> {
    const tagRef = doc(db, 'tags', tagId);
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    };

    await updateDoc(tagRef, updateData);
  },

  // Delete tag
  async deleteTag(tagId: string): Promise<void> {
    await deleteDoc(doc(db, 'tags', tagId));
  },

  // Get all tags for user
  async getTags(userId: string): Promise<Tag[]> {
    const q = query(
      collection(db, 'tags'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate(),
          updatedAt: (data.updatedAt as Timestamp).toDate()
        } as Tag;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  },

  // Get tags by IDs
  async getTagsByIds(tagIds: string[]): Promise<Tag[]> {
    if (tagIds.length === 0) return [];

    const tags: Tag[] = [];
    // Firestore 'in' queries have a limit of 10 items
    // Split into batches if needed
    const batchSize = 10;
    for (let i = 0; i < tagIds.length; i += batchSize) {
      const batch = tagIds.slice(i, i + batchSize);
      const q = query(
        collection(db, 'tags'),
        where('__name__', 'in', batch)
      );
      const snapshot = await getDocs(q);
      
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        tags.push({
          id: docSnap.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate(),
          updatedAt: (data.updatedAt as Timestamp).toDate()
        } as Tag);
      });
    }

    return tags;
  },

  // Get popular tags (most used)
  async getPopularTags(userId: string, limit: number = 5): Promise<Tag[]> {
    // This is a simplified version
    // For real usage stats, you'd need to track tag usage counts
    const tags = await this.getTags(userId);
    return tags.slice(0, limit);
  },

  // Bulk create default tags for new user
  async createDefaultTags(userId: string): Promise<void> {
    const defaultTags = [
      { name: 'Acil', color: '#FF6B6B', icon: '🚨' },
      { name: 'Önemli', color: '#FFA07A', icon: '⭐' },
      { name: 'Planlı', color: '#45B7D1', icon: '📅' },
      { name: 'Tasarruf', color: '#98D8C8', icon: '💰' },
      { name: 'Yatırım', color: '#6C5CE7', icon: '📈' },
    ];

    const batch = writeBatch(db);
    const tagsRef = collection(db, 'tags');

    defaultTags.forEach(tag => {
      const docRef = doc(tagsRef);
      batch.set(docRef, {
        userId,
        name: tag.name,
        color: tag.color,
        icon: tag.icon,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      });
    });

    await batch.commit();
  }
};
