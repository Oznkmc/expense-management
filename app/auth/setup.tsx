import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function SetupWizard() {
  const [step, setStep] = useState(1);
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const { updateUserProfile } = useAuth();
  const router = useRouter();

  const handleFinish = async () => {
    const budget = parseFloat(monthlyBudget);
    if (isNaN(budget) || budget <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir bütçe girin');
      return;
    }

    try {
      await updateUserProfile({
        monthlyBudget: budget,
        setupCompleted: true
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>🎉 Hoş Geldin!</Text>
          <Text style={styles.subtitle}>
            Harcamalarını takip etmeye başlamak için birkaç bilgiye ihtiyacımız var
          </Text>
        </View>

        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Aylık Bütçen</Text>
            <Text style={styles.stepDescription}>
              Her ay ne kadar harcama yapabileceğini belirle. Bu harçlık, burs veya
              part-time işinden elde ettiğin gelir olabilir.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Aylık Bütçe (₺)</Text>
              <TextInput
                style={styles.input}
                placeholder="örn: 3000"
                value={monthlyBudget}
                onChangeText={setMonthlyBudget}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 İpucu: Bu değeri sonradan değiştirebilirsin. Gelir eklediğinde
                otomatik olarak bütçene eklenecek.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleFinish}
            >
              <Text style={styles.buttonText}>Başla 🚀</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Neler Yapabilirsin?</Text>
          
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>💰</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Hızlı Harcama Takibi</Text>
              <Text style={styles.featureText}>
                Harcamalarını kolayca ekle ve kategorize et
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📊</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Detaylı Raporlar</Text>
              <Text style={styles.featureText}>
                Harcama alışkanlıklarını analiz et
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🎯</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Bütçe Yönetimi</Text>
              <Text style={styles.featureText}>
                Kategori bazlı limitler koy ve kontrol et
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📸</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Fiş Saklama</Text>
              <Text style={styles.featureText}>
                Faturalarını fotoğraflayarak sakla
              </Text>
            </View>
          </View>
        </View>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  stepContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    color: '#1976d2',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  features: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  feature: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
});
