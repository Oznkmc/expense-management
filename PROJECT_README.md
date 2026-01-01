# 💰 Harcama Takip Uygulaması

Yurt ve öğrenci evi sakinleri için geliştirilmiş basit ve kullanışlı harcama takip uygulaması.

## 🎯 Özellikler

### ✅ Tamamlanan Özellikler

#### 1. Kullanıcı Yönetimi
- ✅ Firebase Authentication ile email/şifre girişi
- ✅ Kullanıcı profil yönetimi
- ✅ İlk kurulum wizard'ı
- ✅ Aylık bütçe belirleme

#### 2. Harcama Yönetimi
- ✅ Hızlı harcama ekleme
- ✅ 17 farklı kategori:
  - 🍽️ Yemek (Kantine, Dışarıda, Market)
  - 🚌 Ulaşım (Otobüs, Taksi, Yakıt)
  - 📚 Eğitim (Kitap, Kırtasiye, Fotokopi)
  - 🎮 Eğlence (Sinema, Kafe, Sosyal)
  - 👕 Giyim
  - 📱 İletişim (İnternet, Telefon)
  - 🏥 Sağlık
  - 💰 Diğer
- ✅ Not ekleme
- ✅ Fiş/fatura fotoğrafı ekleme
- ✅ Harcama listesi görüntüleme
- ✅ Aylık harcama filtreleme

#### 3. Dashboard (Ana Ekran)
- ✅ Kalan bütçe gösterimi
- ✅ Ayın kalan günü
- ✅ Günlük ortalama harcama limiti
- ✅ Toplam harcama özeti
- ✅ Kategori bazlı harcama kartları
- ✅ Son 5 harcama listesi
- ✅ Yenileme (pull-to-refresh)

#### 4. Raporlar
- ✅ Aylık gelir/gider özeti
- ✅ Kategori dağılımı (Pasta grafik)
- ✅ 6 aylık harcama trendi (Çizgi grafik)
- ✅ En yüksek 5 harcama
- ✅ Önceki ay ile karşılaştırma

#### 5. Ayarlar
- ✅ Profil düzenleme
- ✅ Aylık bütçe güncelleme
- ✅ Hesap bilgileri
- ✅ Çıkış yapma

## 🚀 Teknoloji Stack

- **Frontend**: React Native 0.81.5
- **Framework**: Expo SDK 54
- **Routing**: Expo Router 6
- **Backend**: Firebase
  - Authentication
  - Firestore Database
  - Storage (fotoğraf saklama)
- **Charts**: React Native Chart Kit
- **Language**: TypeScript
- **State Management**: React Context API

## 📁 Proje Yapısı

```
ExpenseManagement/
├── app/                          # Expo Router sayfaları
│   ├── (tabs)/                  # Tab navigation sayfaları
│   │   ├── index.tsx           # Ana sayfa / Dashboard
│   │   ├── reports.tsx         # Raporlar sayfası
│   │   └── explore.tsx         # Ayarlar sayfası
│   ├── auth/                   # Kimlik doğrulama sayfaları
│   │   ├── login.tsx          # Giriş/Kayıt sayfası
│   │   └── setup.tsx          # İlk kurulum wizard
│   ├── expenses/              # Harcama sayfaları
│   │   ├── add.tsx           # Harcama ekleme
│   │   └── list.tsx          # Harcama listesi
│   └── _layout.tsx           # Ana layout & auth kontrolü
├── components/                # Yeniden kullanılabilir bileşenler
├── contexts/                  # React Context providers
│   └── AuthContext.tsx       # Kimlik doğrulama context
├── services/                 # Firebase servis katmanı
│   ├── expenseService.ts    # Harcama işlemleri
│   ├── incomeService.ts     # Gelir işlemleri
│   └── budgetService.ts     # Bütçe & rapor işlemleri
├── types/                    # TypeScript tip tanımları
│   └── index.ts
├── firebase.ts              # Firebase yapılandırması
└── package.json
```

## 🛠️ Kurulum

### Gereksinimler
- Node.js 18+
- npm veya yarn
- Expo CLI
- iOS Simulator (macOS) veya Android Emulator

### Adımlar

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Uygulamayı başlatın:
```bash
npm start
```

3. Platform seçin:
- `a` - Android emulator
- `i` - iOS simulator
- `w` - Web tarayıcı

## 🔥 Firebase Yapılandırması

Proje Firebase ile entegre edilmiştir. Firebase yapılandırması `firebase.ts` dosyasında bulunmaktadır.

### Firestore Koleksiyonları

#### users
```typescript
{
  uid: string
  email: string
  displayName: string
  monthlyBudget: number
  setupCompleted: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### expenses
```typescript
{
  userId: string
  amount: number
  category: ExpenseCategory
  date: Date
  note?: string
  photoURL?: string
  createdAt: Date
  updatedAt: Date
}
```

#### incomes
```typescript
{
  userId: string
  amount: number
  type: IncomeType
  date: Date
  note?: string
  isRecurring: boolean
  recurringDay?: number
  createdAt: Date
  updatedAt: Date
}
```

## 📱 Ekran Görüntüleri

### Ana Sayfa (Dashboard)
- Kalan bütçe kartı
- Günlük harcama limiti
- Kategori özeti
- Son harcamalar

### Harcama Ekleme
- Tutar girişi
- Kategori seçimi (ana kategori > alt kategori)
- Not ekleme
- Fotoğraf ekleme (kamera/galeri)

### Raporlar
- Gelir/Gider/Bakiye kartları
- Pasta grafik (kategori dağılımı)
- Çizgi grafik (6 aylık trend)
- En yüksek harcamalar

### Ayarlar
- Profil düzenleme
- Bütçe güncelleme
- Hesap bilgileri

## 🎨 Tasarım Kararları

### Renk Paleti
- **Primary Blue**: #007AFF (Butonlar, vurgular)
- **Success Green**: #34C759 (Gelir, pozitif)
- **Danger Red**: #FF3B30 (Gider, negatif)
- **Warning Yellow**: #FFD60A (Uyarılar)
- **Background**: #F5F5F5
- **Card**: #FFFFFF

### Kullanıcı Deneyimi
- Basit ve sezgisel arayüz
- Emoji kullanımı (kategoriler için)
- Hızlı erişim butonları
- Pull-to-refresh desteği
- Loading states
- Error handling

## 🔐 Güvenlik

- Firebase Authentication ile güvenli giriş
- Firestore güvenlik kuralları
- Kullanıcı verileri izole
- Hassas bilgiler şifrelenmeli

## 📊 Performans

- Lazy loading
- Image optimization
- Efficient queries (indexed)
- Minimal re-renders
- Async storage caching

## 🚧 Gelecek Özellikler (Roadmap)

### Gelir Yönetimi
- [ ] Gelir ekleme ekranı
- [ ] Düzenli gelir tanımlama
- [ ] Gelir kategorileri

### Bütçe Yönetimi
- [ ] Kategori bazlı limit belirleme
- [ ] Limit aşımı bildirimleri
- [ ] Bütçe önerileri

### İleri Seviye Raporlar
- [ ] Yıllık raporlar
- [ ] Kategori detay raporları
- [ ] Export (PDF/Excel)
- [ ] Karşılaştırmalı analizler

### Sosyal Özellikler
- [ ] Grup harcama takibi (oda arkadaşları)
- [ ] Ortak giderler
- [ ] Borç takibi

### Diğer
- [ ] Dark mode
- [ ] Çoklu dil desteği
- [ ] Widget desteği
- [ ] Backup & restore
- [ ] Google Sign-In

## 🐛 Bilinen Sorunlar

- Chart kitaplığı web platformunda görüntüleme sorunları olabilir
- Image picker iOS simulator'da çalışmayabilir

## 📝 Lisans

Bu proje eğitim amaçlı geliştirilmiştir.

## 👨‍💻 Geliştirici

Harcama Takip Uygulaması - Öğrenci Evi Yönetimi

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📞 İletişim

Sorular ve geri bildirimler için issue açabilirsiniz.

---

**Not**: Bu uygulama React Native ve Expo kullanılarak geliştirilmiştir. Mobil ve web platformlarında çalışır.
