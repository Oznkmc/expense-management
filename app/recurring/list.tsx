import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { recurringExpenseService } from '../../services/recurringExpenseService';
import {
  RecurringExpense,
  RecurringFrequency,
  RecurringStatus,
  RecurringFrequencyNames,
  ExpenseCategory,
  CategoryNames,
  CategoryIcons
} from '../../types';

export default function RecurringExpensesScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.OTHER);
  const [frequency, setFrequency] = useState<RecurringFrequency>(RecurringFrequency.MONTHLY);
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Common recurring expense templates
  const templates = [
    { icon: '🏠', name: 'Kira', category: ExpenseCategory.OTHER },
    { icon: '📱', name: 'Telefon Faturası', category: ExpenseCategory.COMMUNICATION_PHONE },
    { icon: '💡', name: 'Elektrik', category: ExpenseCategory.OTHER },
    { icon: '💧', name: 'Su', category: ExpenseCategory.OTHER },
    { icon: '🌐', name: 'İnternet', category: ExpenseCategory.COMMUNICATION_INTERNET },
    { icon: '🎬', name: 'Netflix', category: ExpenseCategory.ENTERTAINMENT_SOCIAL },
    { icon: '🎵', name: 'Spotify', category: ExpenseCategory.ENTERTAINMENT_SOCIAL },
    { icon: '🏋️', name: 'Spor Salonu', category: ExpenseCategory.HEALTH },
  ];

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [user])
  );

  const loadExpenses = async () => {
    if (!user) return;

    try {
      const data = await recurringExpenseService.getRecurringExpenses(user.uid);
      setExpenses(data);
    } catch (error) {
      console.error('Load error:', error);
      Alert.alert('Hata', 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setCategory(ExpenseCategory.OTHER);
    setFrequency(RecurringFrequency.MONTHLY);
    setDayOfMonth('1');
    setNote('');
    setShowForm(false);
  };

  const handleTemplateSelect = (template: typeof templates[0]) => {
    setTitle(template.name);
    setCategory(template.category);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Hata', 'Oturum bulunamadı');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Eksik Bilgi', 'Harcama adını girin');
      return;
    }

    const amountNum = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Geçersiz Tutar', 'Pozitif bir tutar girin');
      return;
    }

    const day = parseInt(dayOfMonth);
    if (frequency === RecurringFrequency.MONTHLY && (isNaN(day) || day < 1 || day > 31)) {
      Alert.alert('Geçersiz Gün', 'Ayın gününü 1-31 arasında girin');
      return;
    }

    setSaving(true);
    try {
      await recurringExpenseService.addRecurringExpense(
        user.uid,
        title.trim(),
        amountNum,
        category,
        frequency,
        frequency === RecurringFrequency.MONTHLY ? day : undefined,
        undefined,
        undefined,
        note.trim()
      );

      resetForm();
      await loadExpenses();
      Alert.alert('✅ Kaydedildi', 'Tekrarlayan harcama eklendi');
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Hata', error.message || 'Kayıt başarısız');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (expense: RecurringExpense) => {
    const nextStatus = expense.status === RecurringStatus.ACTIVE
      ? RecurringStatus.PAUSED
      : RecurringStatus.ACTIVE;

    try {
      await recurringExpenseService.updateRecurringExpense(expense.id, { status: nextStatus });
      setExpenses(prev => prev.map(e => e.id === expense.id ? { ...e, status: nextStatus } : e));
    } catch (error) {
      Alert.alert('Hata', 'Durum güncellenemedi');
    }
  };

  const handleDelete = (expense: RecurringExpense) => {
    Alert.alert(
      'Sil',
      `"${expense.title}" tekrarlayan harcamasını silmek istiyor musun?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await recurringExpenseService.deleteRecurringExpense(expense.id);
              setExpenses(prev => prev.filter(e => e.id !== expense.id));
            } catch (error) {
              Alert.alert('Hata', 'Silinemedi');
            }
          }
        }
      ]
    );
  };

  const handleProcessNow = async (expense: RecurringExpense) => {
    Alert.alert(
      'Harcamayı Oluştur',
      `"${expense.title}" için şimdi bir harcama kaydı oluşturulsun mu?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Oluştur',
          onPress: async () => {
            try {
              await recurringExpenseService.processRecurringExpense(expense);
              await loadExpenses();
              Alert.alert('✅ Başarılı', 'Harcama oluşturuldu');
            } catch (error) {
              Alert.alert('Hata', 'Harcama oluşturulamadı');
            }
          }
        }
      ]
    );
  };

  const formatDate = (date: Date) => date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const getDaysUntil = (date: Date): number => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  const activeExpenses = expenses.filter(e => e.status === RecurringStatus.ACTIVE);
  const pausedExpenses = expenses.filter(e => e.status === RecurringStatus.PAUSED);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadExpenses();
          }}
          colors={['#2563EB']}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🔄 Tekrarlayan Harcamalar</Text>
        <Text style={styles.subtitle}>Kira, faturalar ve abonelikler</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>💡</Text>
        <Text style={styles.infoText}>
          Düzenli ödemelerini ekle, otomatik hatırlat. Her ayın belirlediğin gününde tekrar eder.
        </Text>
      </View>

      {!showForm && (
        <>
          <View style={styles.templatesSection}>
            <Text style={styles.sectionTitle}>⚡ Hızlı Ekle</Text>
            <View style={styles.templatesGrid}>
              {templates.map((template, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.templateButton}
                  onPress={() => handleTemplateSelect(template)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.templateIcon}>{template.icon}</Text>
                  <Text style={styles.templateName}>{template.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>+ Özel Harcama Ekle</Text>
          </TouchableOpacity>
        </>
      )}

      {showForm && (
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Yeni Tekrarlayan Harcama</Text>
            <TouchableOpacity onPress={resetForm}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Harcama Adı *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Netflix aboneliği"
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tutar *</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>₺</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={text => setAmount(text.replace(/[^0-9.,]/g, ''))}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kategori *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {Object.values(ExpenseCategory).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={styles.categoryChipIcon}>{CategoryIcons[cat]}</Text>
                  <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                    {CategoryNames[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tekrar Sıklığı *</Text>
            <View style={styles.frequencyRow}>
              {Object.values(RecurringFrequency).map(freq => (
                <TouchableOpacity
                  key={freq}
                  style={[styles.frequencyButton, frequency === freq && styles.frequencyButtonActive]}
                  onPress={() => setFrequency(freq)}
                >
                  <Text style={[styles.frequencyText, frequency === freq && styles.frequencyTextActive]}>
                    {RecurringFrequencyNames[freq]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {frequency === RecurringFrequency.MONTHLY && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ayın Kaçında? *</Text>
              <TextInput
                style={styles.input}
                placeholder="1-31 arası"
                keyboardType="number-pad"
                value={dayOfMonth}
                onChangeText={setDayOfMonth}
                maxLength={2}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Not (opsiyonel)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Açıklama..."
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📋 Aktif Harcamalar</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{activeExpenses.length}</Text>
        </View>
      </View>

      {activeExpenses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔄</Text>
          <Text style={styles.emptyText}>Henüz tekrarlayan harcama yok</Text>
          <Text style={styles.emptyHint}>Yukarıdan ekleyerek başla</Text>
        </View>
      ) : (
        activeExpenses.map(expense => {
          const daysUntil = getDaysUntil(expense.nextDate);
          const isUpcoming = daysUntil <= 3;

          return (
            <View key={expense.id} style={[styles.expenseCard, isUpcoming && styles.expenseCardUpcoming]}>
              <View style={styles.expenseHeader}>
                <View style={styles.expenseLeft}>
                  <Text style={styles.expenseIcon}>{CategoryIcons[expense.category]}</Text>
                  <View>
                    <Text style={styles.expenseTitle}>{expense.title}</Text>
                    <Text style={styles.expenseMeta}>
                      {RecurringFrequencyNames[expense.frequency]} • ₺{expense.amount.toFixed(2)}
                    </Text>
                    <Text style={styles.expenseNextDate}>
                      Sonraki: {formatDate(expense.nextDate)} ({daysUntil} gün)
                    </Text>
                  </View>
                </View>
                {isUpcoming && (
                  <View style={styles.upcomingBadge}>
                    <Text style={styles.upcomingText}>Yaklaşıyor</Text>
                  </View>
                )}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => toggleStatus(expense)}
                >
                  <Text style={styles.actionText}>⏸️ Duraklat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleProcessNow(expense)}
                >
                  <Text style={styles.actionText}>▶️ Şimdi Oluştur</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteActionButton}
                  onPress={() => handleDelete(expense)}
                >
                  <Text style={styles.deleteActionText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {pausedExpenses.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⏸️ Duraklatılmış</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{pausedExpenses.length}</Text>
            </View>
          </View>

          {pausedExpenses.map(expense => (
            <View key={expense.id} style={styles.expenseCardMuted}>
              <View style={styles.expenseHeader}>
                <View style={styles.expenseLeft}>
                  <Text style={styles.expenseIcon}>{CategoryIcons[expense.category]}</Text>
                  <View>
                    <Text style={styles.expenseTitle}>{expense.title}</Text>
                    <Text style={styles.expenseMeta}>
                      {RecurringFrequencyNames[expense.frequency]} • ₺{expense.amount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.resumeButton]}
                  onPress={() => toggleStatus(expense)}
                >
                  <Text style={styles.resumeText}>▶️ Devam Ettir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteActionButton}
                  onPress={() => handleDelete(expense)}
                >
                  <Text style={styles.deleteActionText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  contentContainer: {
    paddingTop: 60,
    paddingBottom: 40
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  backButtonText: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: '600'
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827'
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE'
  },
  infoIcon: {
    fontSize: 24
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20
  },
  templatesSection: {
    marginHorizontal: 20,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  templateButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '23%',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  templateIcon: {
    fontSize: 28,
    marginBottom: 6
  },
  templateName: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'center'
  },
  addButton: {
    marginHorizontal: 20,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827'
  },
  closeButton: {
    fontSize: 24,
    color: '#9CA3AF'
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827'
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  currency: {
    fontSize: 18,
    marginRight: 8,
    color: '#6B7280',
    fontWeight: '600'
  },
  amountInput: {
    flex: 1
  },
  categoryScroll: {
    marginHorizontal: -4
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  categoryChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE'
  },
  categoryChipIcon: {
    fontSize: 16,
    marginRight: 6
  },
  categoryChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600'
  },
  categoryChipTextActive: {
    color: '#1D4ED8'
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  frequencyButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE'
  },
  frequencyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600'
  },
  frequencyTextActive: {
    color: '#1D4ED8'
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4
  },
  buttonDisabled: {
    opacity: 0.5
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12
  },
  countBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE'
  },
  countBadgeText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 13
  },
  emptyState: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827'
  },
  emptyHint: {
    marginTop: 6,
    color: '#6B7280',
    textAlign: 'center'
  },
  expenseCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12
  },
  expenseCardUpcoming: {
    borderColor: '#FCD34D',
    borderWidth: 2
  },
  expenseCardMuted: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  expenseLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1
  },
  expenseIcon: {
    fontSize: 28
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4
  },
  expenseMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4
  },
  expenseNextDate: {
    fontSize: 13,
    color: '#9CA3AF'
  },
  upcomingBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignSelf: 'flex-start'
  },
  upcomingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  actionText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 13
  },
  resumeButton: {
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0'
  },
  resumeText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 13
  },
  deleteActionButton: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  deleteActionText: {
    fontSize: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6'
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280'
  }
});
