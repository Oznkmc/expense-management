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
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { categoryBudgetService } from '../../services/categoryBudgetService';
import { expenseService } from '../../services/expenseService';
import { MainCategory, MainCategoryNames, CategoryBudget } from '../../types';
import { useRouter } from 'expo-router';

export default function CategoryBudgetsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [expenses, setExpenses] = useState<Record<MainCategory, number>>({} as Record<MainCategory, number>);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MainCategory | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const allCategories: MainCategory[] = [
    MainCategory.FOOD,
    MainCategory.TRANSPORT,
    MainCategory.EDUCATION,
    MainCategory.ENTERTAINMENT,
    MainCategory.CLOTHING,
    MainCategory.COMMUNICATION,
    MainCategory.HEALTH,
    MainCategory.OTHER
  ];

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const loadData = async () => {
    if (!user) return;

    try {
      const [budgetsData, expensesData] = await Promise.all([
        categoryBudgetService.getMonthlyBudgets(user.uid, currentYear, currentMonth),
        expenseService.getMonthlyExpenses(user.uid, currentYear, currentMonth)
      ]);

      setBudgets(budgetsData);

      // Calculate expenses by category
      const categoryExpenses: Record<MainCategory, number> = {} as Record<MainCategory, number>;
      allCategories.forEach(cat => {
        categoryExpenses[cat] = 0;
      });

      expensesData.forEach(expense => {
        const mainCat = getMainCategoryFromExpense(expense.category);
        categoryExpenses[mainCat] += expense.amount;
      });

      setExpenses(categoryExpenses);
    } catch (error) {
      console.error('Load data error:', error);
      Alert.alert('Hata', 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getMainCategoryFromExpense = (expenseCategory: string): MainCategory => {
    if (expenseCategory.startsWith('food_')) return MainCategory.FOOD;
    if (expenseCategory.startsWith('transport_')) return MainCategory.TRANSPORT;
    if (expenseCategory.startsWith('education_')) return MainCategory.EDUCATION;
    if (expenseCategory.startsWith('entertainment_')) return MainCategory.ENTERTAINMENT;
    if (expenseCategory.startsWith('communication_')) return MainCategory.COMMUNICATION;
    if (expenseCategory === 'clothing') return MainCategory.CLOTHING;
    if (expenseCategory === 'health') return MainCategory.HEALTH;
    return MainCategory.OTHER;
  };

  const getBudgetForCategory = (category: MainCategory): CategoryBudget | null => {
    return budgets.find(b => b.category === category) || null;
  };

  const handleEditCategory = (category: MainCategory) => {
    const existingBudget = getBudgetForCategory(category);
    setEditingCategory(category);
    setLimitInput(existingBudget ? existingBudget.limit.toString() : '');
  };

  const handleSaveLimit = async () => {
    if (!user || !editingCategory) return;

    const limitNum = parseFloat(limitInput.replace(',', '.'));
    if (isNaN(limitNum) || limitNum <= 0) {
      Alert.alert('Geçersiz Tutar', 'Pozitif bir tutar girin');
      return;
    }

    setSaving(true);
    try {
      await categoryBudgetService.setCategoryBudget(
        user.uid,
        editingCategory,
        limitNum,
        currentYear,
        currentMonth
      );

      setEditingCategory(null);
      setLimitInput('');
      await loadData();
      Alert.alert('✅ Kaydedildi', 'Kategori limiti güncellendi');
    } catch (error) {
      console.error('Save limit error:', error);
      Alert.alert('Hata', 'Limit kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLimit = async (category: MainCategory) => {
    if (!user) return;

    Alert.alert(
      'Limiti Kaldır',
      `${MainCategoryNames[category]} kategorisinin limitini kaldırmak istiyor musun?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            try {
              await categoryBudgetService.deleteCategoryBudget(
                user.uid,
                category,
                currentYear,
                currentMonth
              );
              await loadData();
            } catch (error) {
              Alert.alert('Hata', 'Limit kaldırılamadı');
            }
          }
        }
      ]
    );
  };

  const getPercentage = (spent: number, limit: number): number => {
    return limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  };

  const getStatusColor = (percentage: number): string => {
    if (percentage >= 100) return '#EF4444';
    if (percentage >= 80) return '#F59E0B';
    if (percentage >= 60) return '#10B981';
    return '#3B82F6';
  };

  const formatCurrency = (value: number) => value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          colors={['#2563EB']}
          tintColor="#2563EB"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📊 Kategori Limitleri</Text>
        <Text style={styles.subtitle}>Her kategori için aylık harcama limiti belirle</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>💡</Text>
        <Text style={styles.infoText}>
          Kategorilere limit koyarak harcamalarını kontrol altında tut. Limite yaklaştığında uyarı alacaksın.
        </Text>
      </View>

      {allCategories.map(category => {
        const budget = getBudgetForCategory(category);
        const spent = expenses[category] || 0;
        const hasLimit = !!budget;
        const percentage = hasLimit ? getPercentage(spent, budget.limit) : 0;
        const statusColor = getStatusColor(percentage);
        const isOverLimit = percentage >= 100;
        const isWarning = percentage >= 80 && percentage < 100;

        return (
          <View key={category} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{MainCategoryNames[category]}</Text>
              {hasLimit ? (
                <View style={styles.budgetBadge}>
                  <Text style={styles.budgetText}>Limit: ₺{formatCurrency(budget.limit)}</Text>
                </View>
              ) : (
                <Text style={styles.noLimitText}>Limit yok</Text>
              )}
            </View>

            <View style={styles.spentRow}>
              <Text style={styles.spentLabel}>Harcanan:</Text>
              <Text style={[styles.spentValue, isOverLimit && styles.overLimitText]}>
                ₺{formatCurrency(spent)}
              </Text>
            </View>

            {hasLimit && (
              <>
                <View style={styles.progressBarOuter}>
                  <View
                    style={[
                      styles.progressBarInner,
                      { width: `${percentage}%`, backgroundColor: statusColor }
                    ]}
                  />
                </View>
                <View style={styles.progressInfo}>
                  <Text style={[styles.progressText, { color: statusColor }]}>
                    %{percentage.toFixed(0)} kullanıldı
                  </Text>
                  {isOverLimit ? (
                    <Text style={styles.warningText}>⚠️ Limit aşıldı!</Text>
                  ) : isWarning ? (
                    <Text style={styles.warningText}>⚡ Limite yaklaşıyorsun</Text>
                  ) : (
                    <Text style={styles.remainingText}>
                      Kalan: ₺{formatCurrency(budget.limit - spent)}
                    </Text>
                  )}
                </View>
              </>
            )}

            {editingCategory === category ? (
              <View style={styles.editForm}>
                <View style={styles.amountRow}>
                  <Text style={styles.currency}>₺</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Limit tutarı"
                    keyboardType="decimal-pad"
                    value={limitInput}
                    onChangeText={text => setLimitInput(text.replace(/[^0-9.,]/g, ''))}
                    autoFocus
                  />
                </View>
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.saveButton, saving && styles.buttonDisabled]}
                    onPress={handleSaveLimit}
                    disabled={saving}
                  >
                    <Text style={styles.saveButtonText}>
                      {saving ? '⏳' : '✓ Kaydet'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setEditingCategory(null);
                      setLimitInput('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>✕ İptal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditCategory(category)}
                >
                  <Text style={styles.editButtonText}>
                    {hasLimit ? '✏️ Düzenle' : '+ Limit Ekle'}
                  </Text>
                </TouchableOpacity>
                {hasLimit && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteLimit(category)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️ Kaldır</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}

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
    color: '#111827',
    letterSpacing: -0.5
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
    borderWidth: 1,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    gap: 12
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
  categoryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827'
  },
  budgetBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE'
  },
  budgetText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8'
  },
  noLimitText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic'
  },
  spentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  spentLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },
  spentValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827'
  },
  overLimitText: {
    color: '#EF4444'
  },
  progressBarOuter: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    height: 10,
    overflow: 'hidden',
    marginBottom: 8
  },
  progressBarInner: {
    height: '100%',
    borderRadius: 10
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600'
  },
  warningText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B'
  },
  remainingText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500'
  },
  editForm: {
    marginTop: 8
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  currency: {
    fontSize: 18,
    marginRight: 8,
    color: '#6B7280',
    fontWeight: '600'
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827'
  },
  editActions: {
    flexDirection: 'row',
    gap: 8
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 15
  },
  buttonDisabled: {
    opacity: 0.5
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  editButton: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE'
  },
  editButtonText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 14
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  deleteButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6'
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 16
  }
});
