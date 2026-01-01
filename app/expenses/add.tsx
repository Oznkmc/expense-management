import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { expenseService } from '../../services/expenseService';
import { ExpenseCategory, CategoryNames, CategoryIcons, getMainCategory, MainCategory } from '../../types';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

export default function AddExpenseScreen() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedMainCategory, setExpandedMainCategory] = useState<MainCategory | null>(null);

  const mainCategories: MainCategory[] = [
    MainCategory.FOOD,
    MainCategory.TRANSPORT,
    MainCategory.EDUCATION,
    MainCategory.ENTERTAINMENT,
    MainCategory.CLOTHING,
    MainCategory.COMMUNICATION,
    MainCategory.HEALTH,
    MainCategory.OTHER
  ];

  const getCategoriesByMain = (mainCat: MainCategory): ExpenseCategory[] => {
    return Object.values(ExpenseCategory).filter(cat => getMainCategory(cat) === mainCat);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Hata', 'Galeri erişim izni gerekli');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Hata', 'Kamera erişim izni gerekli');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Hata', 'Geçerli bir tutar girin');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Hata', 'Lütfen bir kategori seçin');
      return;
    }

    setLoading(true);
    try {
      await expenseService.addExpense(
        user.uid,
        amountNum,
        selectedCategory,
        date,
        note,
        imageUri || undefined
      );
      
      Alert.alert('Başarılı', 'Harcama eklendi', [
        { text: 'Tamam', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Yeni Harcama</Text>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Tutar (₺)</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Selected Category Display */}
        {selectedCategory && (
          <View style={styles.selectedCategoryBox}>
            <Text style={styles.selectedLabel}>Seçili Kategori:</Text>
            <View style={styles.selectedCategoryContent}>
              <Text style={styles.selectedCategoryIcon}>{CategoryIcons[selectedCategory]}</Text>
              <Text style={styles.selectedCategoryName}>{CategoryNames[selectedCategory]}</Text>
            </View>
          </View>
        )}

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Kategori Seçin</Text>
          {mainCategories.map(mainCat => {
            const mainCatName = {
              [MainCategory.FOOD]: '🍽️ Yemek',
              [MainCategory.TRANSPORT]: '🚌 Ulaşım',
              [MainCategory.EDUCATION]: '📚 Eğitim',
              [MainCategory.ENTERTAINMENT]: '🎮 Eğlence',
              [MainCategory.CLOTHING]: '👕 Giyim',
              [MainCategory.COMMUNICATION]: '📱 İletişim',
              [MainCategory.HEALTH]: '🏥 Sağlık',
              [MainCategory.OTHER]: '💰 Diğer'
            }[mainCat];

            const subCategories = getCategoriesByMain(mainCat);
            const isExpanded = expandedMainCategory === mainCat;

            return (
              <View key={mainCat} style={styles.categoryGroup}>
                <TouchableOpacity
                  style={styles.mainCategoryButton}
                  onPress={() => setExpandedMainCategory(isExpanded ? null : mainCat)}
                >
                  <Text style={styles.mainCategoryText}>{mainCatName}</Text>
                  <Text>{isExpanded ? '▼' : '▶'}</Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.subCategories}>
                    {subCategories.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryButton,
                          selectedCategory === cat && styles.categoryButtonSelected
                        ]}
                        onPress={() => setSelectedCategory(cat)}
                      >
                        <Text style={styles.categoryIcon}>{CategoryIcons[cat]}</Text>
                        <Text style={[
                          styles.categoryText,
                          selectedCategory === cat && styles.categoryTextSelected
                        ]}>
                          {CategoryNames[cat]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.label}>Not (Opsiyonel)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Harcama notu..."
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        {/* Photo */}
        <View style={styles.section}>
          <Text style={styles.label}>Fiş/Fatura Fotoğrafı</Text>
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
              <Text>📸 Fotoğraf Çek</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              <Text>🖼️ Galeriden Seç</Text>
            </TouchableOpacity>
          </View>
          {imageUri && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImageUri(null)}
              >
                <Text style={styles.removeImageText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? '⏳ Kaydediliyor...' : '✅ Harcamayı Kaydet'}
          </Text>
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>İptal</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  amountInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  categoryGroup: {
    marginBottom: 8,
  },
  mainCategoryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  mainCategoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subCategories: {
    paddingLeft: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
  },
  categoryTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  noteInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  imagePreview: {
    marginTop: 12,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedCategoryBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  selectedLabel: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedCategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCategoryIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  selectedCategoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
