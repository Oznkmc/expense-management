# 🛠️ Geliştirici Kılavuzu

Bu dokümanda uygulamayı geliştirmek ve özelleştirmek için gereken bilgiler bulunmaktadır.

## 📚 İçindekiler

1. [Hızlı Başlangıç](#hızlı-başlangıç)
2. [Proje Mimarisi](#proje-mimarisi)
3. [Yeni Özellik Ekleme](#yeni-özellik-ekleme)
4. [Veritabanı Şeması](#veritabanı-şeması)
5. [API Referansı](#api-referansı)
6. [Test Etme](#test-etme)
7. [Dağıtım](#dağıtım)

## 🚀 Hızlı Başlangıç

### Geliştirme Ortamı

```bash
# Bağımlılıkları yükle
npm install

# Development server başlat
npm start

# Android'de çalıştır
npm run android

# iOS'ta çalıştır (macOS)
npm run ios

# Web'de çalıştır
npm run web
```

### Firebase Kurulumu

1. Firebase Console'da yeni proje oluşturun
2. Authentication'ı etkinleştirin (Email/Password)
3. Firestore Database oluşturun
4. Storage'ı etkinleştirin
5. Web app yapılandırmasını alın
6. `firebase.ts` dosyasındaki config bilgilerini güncelleyin

### Firestore Güvenlik Kuralları

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Expenses collection
    match /expenses/{expenseId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
    
    // Incomes collection
    match /incomes/{incomeId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
  }
}
```

### Storage Güvenlik Kuralları

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /expenses/{userId}/{filename} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🏗️ Proje Mimarisi

### Katmanlı Mimari

```
┌─────────────────────┐
│   Presentation      │ - React Components, Screens
│   (UI Layer)        │
├─────────────────────┤
│   Business Logic    │ - Contexts, Hooks
│   (Logic Layer)     │
├─────────────────────┤
│   Service Layer     │ - Firebase Services
│   (Data Access)     │
├─────────────────────┤
│   Firebase          │ - Authentication, Firestore, Storage
│   (Backend)         │
└─────────────────────┘
```

### Veri Akışı

```
User Action → Component → Context/Hook → Service → Firebase → Response → Context Update → UI Update
```

## 🆕 Yeni Özellik Ekleme

### 1. Yeni Kategori Ekleme

`types/index.ts` dosyasında:

```typescript
export enum ExpenseCategory {
  // ... mevcut kategoriler
  NEW_CATEGORY = 'new_category',
}

export const CategoryIcons: Record<ExpenseCategory, string> = {
  // ... mevcut ikonlar
  [ExpenseCategory.NEW_CATEGORY]: '🆕',
};

export const CategoryNames: Record<ExpenseCategory, string> = {
  // ... mevcut isimler
  [ExpenseCategory.NEW_CATEGORY]: 'Yeni Kategori',
};
```

### 2. Yeni Ekran Ekleme

```typescript
// app/myscreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MyScreen() {
  return (
    <View style={styles.container}>
      <Text>Yeni Ekranım</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

`app/_layout.tsx` içinde route ekleyin:

```typescript
<Stack.Screen 
  name="myscreen" 
  options={{ title: 'Yeni Ekran' }} 
/>
```

### 3. Yeni Service Fonksiyonu Ekleme

```typescript
// services/expenseService.ts
export const expenseService = {
  // ... mevcut fonksiyonlar
  
  async getExpensesByDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Expense[]> {
    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: (doc.data().date as Timestamp).toDate(),
      createdAt: (doc.data().createdAt as Timestamp).toDate(),
      updatedAt: (doc.data().updatedAt as Timestamp).toDate()
    } as Expense));
  }
};
```

## 💾 Veritabanı Şeması

### Firestore İndeksler

Performans için gerekli indeksler:

```
Collection: expenses
- userId (Ascending) + date (Descending)
- userId (Ascending) + category (Ascending) + date (Descending)

Collection: incomes
- userId (Ascending) + date (Descending)
- userId (Ascending) + isRecurring (Ascending)
```

Firebase Console > Firestore > Indexes bölümünden ekleyebilirsiniz.

### Veri Modelleri

#### Expense Model
```typescript
interface Expense {
  id: string;                    // Firestore document ID
  userId: string;                // User reference
  amount: number;                // Tutar (pozitif sayı)
  category: ExpenseCategory;     // Kategori enum
  date: Date;                    // Harcama tarihi
  note?: string;                 // Opsiyonel not
  photoURL?: string;             // Storage URL
  createdAt: Date;               // Oluşturulma zamanı
  updatedAt: Date;               // Güncellenme zamanı
}
```

## 📡 API Referansı

### AuthContext

```typescript
const { 
  user,              // Firebase User
  userProfile,       // UserProfile object
  loading,           // boolean
  signIn,            // (email, password) => Promise<void>
  signUp,            // (email, password, name) => Promise<void>
  signOut,           // () => Promise<void>
  updateUserProfile  // (data) => Promise<void>
} = useAuth();
```

### ExpenseService

```typescript
// Harcama ekle
await expenseService.addExpense(userId, amount, category, date, note?, imageUri?);

// Harcama güncelle
await expenseService.updateExpense(expenseId, { amount: 100 });

// Harcama sil
await expenseService.deleteExpense(expenseId);

// Aylık harcamaları getir
const expenses = await expenseService.getMonthlyExpenses(userId, 2026, 1);

// Son harcamaları getir
const recent = await expenseService.getRecentExpenses(userId, 10);
```

### BudgetService

```typescript
// Bütçe özeti
const summary = await budgetService.getBudgetSummary(userId, monthlyBudget);

// Aylık rapor
const report = await budgetService.getMonthlyReport(userId, 2026, 1);

// Harcama trendi
const trend = await budgetService.getSpendingTrend(userId);

// Ay karşılaştırması
const comparison = await budgetService.compareMonths(userId);
```

## 🧪 Test Etme

### Manuel Test Senaryoları

#### Kullanıcı Kaydı ve Girişi
1. Yeni kullanıcı kaydı oluştur
2. Çıkış yap
3. Tekrar giriş yap
4. Hatalı şifre ile giriş dene (başarısız olmalı)

#### Harcama Ekleme
1. Ana sayfadan "Hızlı Harcama Ekle" butonuna tıkla
2. Tutar gir
3. Kategori seç
4. Not ekle
5. Fotoğraf ekle
6. Kaydet
7. Ana sayfada görünmeli

#### Dashboard
1. Kalan bütçenin doğru hesaplandığını kontrol et
2. Kategori kartlarının doğru olduğunu kontrol et
3. Yenile (pull-to-refresh) yap

### Test Verileri Oluşturma

```typescript
// Örnek test harcamaları eklemek için
const testData = [
  { amount: 50, category: ExpenseCategory.FOOD_CANTEEN, note: 'Öğle yemeği' },
  { amount: 20, category: ExpenseCategory.TRANSPORT_BUS, note: 'Otobüs kartı' },
  { amount: 100, category: ExpenseCategory.EDUCATION_BOOKS, note: 'Ders kitabı' },
];

for (const data of testData) {
  await expenseService.addExpense(
    user.uid, 
    data.amount, 
    data.category, 
    new Date(), 
    data.note
  );
}
```

## 🚀 Dağıtım

### Expo Build

```bash
# Android APK oluştur
eas build --platform android

# iOS IPA oluştur (macOS)
eas build --platform ios

# Her ikisi için
eas build --platform all
```

### Environment Variables

`.env` dosyası oluşturun:

```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

### Release Checklist

- [ ] Firebase güvenlik kuralları aktif
- [ ] Environment variables ayarlandı
- [ ] Hata yönetimi kontrol edildi
- [ ] Loading states eklendi
- [ ] Offline durumu kontrol edildi
- [ ] Icon ve splash screen güncellendi
- [ ] App store açıklaması hazırlandı
- [ ] Privacy policy oluşturuldu
- [ ] Test edildi (iOS & Android)

## 🐛 Debugging

### Firebase Errors

```typescript
try {
  await expenseService.addExpense(...);
} catch (error: any) {
  console.log('Error code:', error.code);
  console.log('Error message:', error.message);
  
  if (error.code === 'permission-denied') {
    Alert.alert('Erişim reddedildi');
  }
}
```

### React Native Debugger

1. Chrome DevTools: Shake device → "Debug"
2. Expo DevTools: Terminal'de "d" tuşuna bas
3. React DevTools: `npm install -g react-devtools`

### Logging

```typescript
// Development
if (__DEV__) {
  console.log('Debug info:', data);
}

// Production
// Firebase Analytics kullan
```

## 📖 Öğrenme Kaynakları

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [Firebase Docs](https://firebase.google.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Navigation](https://reactnavigation.org/)

## 💡 Best Practices

### Performance
- `useMemo` ve `useCallback` kullan
- FlatList için `keyExtractor` ekle
- Image'leri optimize et
- Lazy loading kullan

### Code Quality
- TypeScript strict mode kullan
- ESLint rules'u takip et
- Component'ları küçük tut
- Reusable components oluştur

### Security
- Sensitive data'yı console.log'lama
- Environment variables kullan
- Firebase rules'ı test et
- Input validation yap

---

Sorularınız için GitHub Issues kullanabilirsiniz!
