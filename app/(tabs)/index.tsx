import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Dimensions,
  Platform,
  Animated,
  Alert
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useAuth } from '../../contexts/AuthContext';
import { budgetService } from '../../services/budgetService';
import { expenseService } from '../../services/expenseService';
import { incomeService } from '../../services/incomeService';
import { categoryBudgetService } from '../../services/categoryBudgetService';
import { BudgetSummary, Expense, MainCategoryNames, Income, CategoryBudget, MainCategory } from '../../types';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, userProfile } = useAuth();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [recentIncomes, setRecentIncomes] = useState<Income[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const router = useRouter();

  const loadData = async () => {
    if (!user || !userProfile) return;

    try {
      const now = new Date();
      const [budgetSummary, expenses, incomes, budgets] = await Promise.all([
        budgetService.getBudgetSummary(user.uid, userProfile.monthlyBudget),
        expenseService.getRecentExpenses(user.uid, 5),
        incomeService.getMonthlyIncomes(user.uid, now.getFullYear(), now.getMonth() + 1),
        categoryBudgetService.getMonthlyBudgets(user.uid, now.getFullYear(), now.getMonth() + 1)
      ]);

      setSummary(budgetSummary);
      setRecentExpenses(expenses);
      setRecentIncomes(incomes.slice(0, 5));
      setCategoryBudgets(budgets);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, userProfile]);

  useFocusEffect(
    React.useCallback(() => {
      if (user && userProfile) {
        loadData();
      }
    }, [user, userProfile])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const confirmDeleteExpense = (expenseId: string) => {
    Alert.alert('Sil', 'Bu harcamayı silmek istediğine emin misin?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await expenseService.deleteExpense(expenseId);
            setRecentExpenses((prev) => prev.filter((e) => e.id !== expenseId));
            loadData();
          } catch (err) {
            Alert.alert('Hata', 'Harcama silinirken bir sorun oluştu');
          }
        }
      }
    ]);
  };

  const confirmDeleteIncome = (incomeId: string) => {
    Alert.alert('Sil', 'Bu geliri silmek istediğine emin misin?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await incomeService.deleteIncome(incomeId);
            setRecentIncomes((prev) => prev.filter((i) => i.id !== incomeId));
            loadData();
          } catch (err) {
            Alert.alert('Hata', 'Gelir silinirken bir sorun oluştu');
          }
        }
      }
    ]);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return '☀️ Günaydın';
    if (hour >= 12 && hour < 18) return '👋 İyi günler';
    if (hour >= 18 && hour < 22) return '🌙 İyi akşamlar';
    return '🌃 İyi geceler';
  };

  const getBudgetStatusEmoji = (percentage: number) => {
    if (percentage < 50) return '🎉';
    if (percentage < 75) return '👍';
    if (percentage < 90) return '⚠️';
    return '🚨';
  };

  const renderDeleteAction = (onPress: () => void) => (
    <TouchableOpacity style={styles.swipeAction} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.swipeDeleteIcon}>🗑️</Text>
      <Text style={styles.swipeDeleteText}>Sil</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!summary) return null;

  const totalBudget = summary.totalBudget + summary.totalIncome;
  const budgetPercentage = totalBudget > 0 ? (summary.totalExpenses / totalBudget) * 100 : 0;
  const isOverBudget = summary.remaining < 0;
  const isWarning = budgetPercentage > 75 && !isOverBudget;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {getGreeting()}, {userProfile?.displayName?.split(' ')[0] || 'Kullanıcı'}
          </Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              weekday: 'long'
            })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push('/(tabs)/explore')}
          activeOpacity={0.7}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Main Budget Card */}
      <TouchableOpacity 
        onPress={() => router.push('/(tabs)/reports')}
        activeOpacity={0.7}
      >
        <View style={[
          styles.budgetCard,
          isOverBudget && styles.budgetCardDanger,
          isWarning && styles.budgetCardWarning
        ]}>
          <View style={styles.budgetHeader}>
            <View>
              <Text style={styles.budgetLabel}>Kalan Bütçe</Text>
              <Text style={styles.budgetSubLabel}>
                {summary.daysLeft} gün kaldı • {getBudgetStatusEmoji(budgetPercentage)}
              </Text>
            </View>
            <View style={styles.percentageContainer}>
              <Text style={styles.percentageText}>
                {budgetPercentage.toFixed(0)}%
              </Text>
            </View>
          </View>

          <Text style={[styles.budgetAmount, isOverBudget && styles.budgetAmountDanger]}>
            ₺{Math.abs(summary.remaining).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>

          {isOverBudget && (
            <Text style={styles.overBudgetWarning}>Bütçe aşıldı!</Text>
          )}

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(budgetPercentage, 100)}%` },
                  isOverBudget && styles.progressFillDanger,
                  isWarning && styles.progressFillWarning
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {budgetPercentage.toFixed(1)}%
            </Text>
          </View>

          <View style={styles.budgetStats}>
            <View style={styles.stat}>
              <Text style={styles.statIcon}>💰</Text>
              <Text style={styles.statLabel}>Toplam</Text>
              <Text style={styles.statValue}>
                ₺{totalBudget.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statIcon}>📉</Text>
              <Text style={styles.statLabel}>Harcama</Text>
            <Text style={styles.statValue}>
              ₺{summary.totalExpenses.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={styles.statLabel}>Günlük</Text>
            <Text style={styles.statValue}>
              ₺{summary.dailyAverage.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>
        </View>
      </TouchableOpacity>

      {/* Quick Action Buttons */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionButton, styles.expenseButton]}
          onPress={() => router.push('/expenses/add')}
          activeOpacity={0.8}
        >
          <Text style={styles.quickActionIcon}>💸</Text>
          <Text style={styles.quickActionText}>Harcama Ekle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionButton, styles.incomeButton]}
          onPress={() => router.push('/incomes/add')}
          activeOpacity={0.8}
        >
          <Text style={styles.quickActionIcon}>💵</Text>
          <Text style={styles.quickActionText}>Gelir Ekle</Text>
        </TouchableOpacity>
      </View>

      {/* Category Budget Warnings */}
      {categoryBudgets.length > 0 && summary && (() => {
        const warnings = categoryBudgets
          .map(budget => {
            const spent = summary.categoryExpenses[budget.category] || 0;
            const percentage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
            return { budget, spent, percentage };
          })
          .filter(item => item.percentage >= 80)
          .sort((a, b) => b.percentage - a.percentage);

        return warnings.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⚠️ Bütçe Uyarıları</Text>
              <TouchableOpacity onPress={() => router.push('/budgets/categories')} activeOpacity={0.7}>
                <Text style={styles.seeAllText}>Düzenle →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.warningsCard}>
              {warnings.map(({ budget, spent, percentage }) => {
                const isOverLimit = percentage >= 100;
                return (
                  <View key={budget.id} style={styles.warningItem}>
                    <View style={styles.warningLeft}>
                      <Text style={styles.warningIcon}>{isOverLimit ? '🚨' : '⚡'}</Text>
                      <View style={styles.warningInfo}>
                        <Text style={styles.warningCategory}>
                          {MainCategoryNames[budget.category]}
                        </Text>
                        <Text style={styles.warningText}>
                          ₺{spent.toFixed(0)} / ₺{budget.limit.toFixed(0)} (%{percentage.toFixed(0)})
                        </Text>
                      </View>
                    </View>
                    <View style={[
                      styles.warningBadge,
                      isOverLimit ? styles.warningBadgeDanger : styles.warningBadgeWarning
                    ]}>
                      <Text style={[
                        styles.warningBadgeText,
                        isOverLimit ? styles.warningBadgeTextDanger : styles.warningBadgeTextWarning
                      ]}>
                        {isOverLimit ? 'Aşıldı!' : 'Dikkat'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null;
      })()}

      {/* Category Summary */}
      {Object.values(summary.categoryExpenses).some(amount => amount > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Kategori Özeti</Text>
          <View style={styles.categoriesGrid}>
            {Object.entries(summary.categoryExpenses)
              .filter(([_, amount]) => amount > 0)
              .sort(([_, a], [__, b]) => b - a)
              .map(([category, amount]) => {
                const categoryPercentage = summary.totalExpenses > 0 ? (amount / summary.totalExpenses) * 100 : 0;
                return (
                  <TouchableOpacity 
                    key={category} 
                    style={styles.categoryCard}
                    onPress={() => router.push(`/expenses/list?category=${category}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>
                        {MainCategoryNames[category as keyof typeof MainCategoryNames]}
                      </Text>
                      <Text style={styles.categoryPercentage}>
                        {categoryPercentage.toFixed(0)}%
                      </Text>
                    </View>
                    <Text style={styles.categoryAmount}>
                      ₺{amount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                    </Text>
                    <View style={styles.categoryProgressBar}>
                      <View
                        style={[
                          styles.categoryProgressFill,
                          { width: `${Math.min(categoryPercentage, 100)}%` }
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>
      )}

      {/* Recent Expenses */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🛒 Son Harcamalar</Text>
          <TouchableOpacity onPress={() => router.push('/expenses/list')} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>Tümünü Gör →</Text>
          </TouchableOpacity>
        </View>

        {recentExpenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🎯</Text>
            <Text style={styles.emptyStateText}>Henüz harcama yok</Text>
            <Text style={styles.emptyStateSubtext}>İlk harcamanı ekleyerek başla!</Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => router.push('/expenses/add')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyStateButtonText}>+ Harcama Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            {recentExpenses.map((expense, index) => (
              <View key={expense.id}>
                <Swipeable
                  renderRightActions={() => renderDeleteAction(() => confirmDeleteExpense(expense.id))}
                  overshootRight={false}
                >
                  <View style={styles.expenseItem}>
                    {expense.photoURL ? (
                      <TouchableOpacity
                        onPress={() => setSelectedImage(expense.photoURL!)}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{ uri: expense.photoURL }}
                          style={styles.expenseThumb}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.expenseIconPlaceholder}>
                        <Text style={styles.expensePlaceholderIcon}>🧾</Text>
                      </View>
                    )}
                    <View style={styles.expenseInfo}>
                      <Text style={styles.expenseNote} numberOfLines={1}>
                        {expense.note || 'Harcama'}
                      </Text>
                      <Text style={styles.expenseDate}>
                        {expense.date.toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    <View style={styles.itemActions}>
                      <Text style={styles.expenseAmount}>
                        -₺{expense.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>
                </Swipeable>
                {index < recentExpenses.length - 1 && <View style={styles.itemDivider} />}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Image Viewer Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={() => setSelectedImage(null)}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedImage(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              {selectedImage && (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
  budgetCard: {
    margin: 20,
    padding: 24,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  budgetCardDanger: {
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
  },
  budgetCardWarning: {
    backgroundColor: '#FF9500',
    shadowColor: '#FF9500',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  budgetLabel: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginBottom: 4,
  },
  budgetSubLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  percentageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  budgetAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -1,
  },
  budgetAmountDanger: {
    color: '#fff',
  },
  overBudgetWarning: {
    fontSize: 14,
    color: '#FFD60A',
    fontWeight: '600',
    marginBottom: 12,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressFillDanger: {
    backgroundColor: '#FFD60A',
  },
  progressFillWarning: {
    backgroundColor: '#FFD60A',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    minWidth: 40,
    textAlign: 'right',
  },
  budgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  expenseButton: {
    backgroundColor: '#34C759',
  },
  incomeButton: {
    backgroundColor: '#007AFF',
  },
  quickActionIcon: {
    fontSize: 20,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: (width - 64) / 2,
    maxWidth: (width - 64) / 2,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    flex: 1,
  },
  categoryPercentage: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '700',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  categoryProgressBar: {
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  expenseThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
  },
  expenseIconPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expensePlaceholderIcon: {
    fontSize: 24,
  },
  expenseInfo: {
    flex: 1,
    marginRight: 12,
  },
  expenseNote: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '600',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  incomeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  incomeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  incomeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  incomeIcon: {
    fontSize: 20,
  },
  incomeInfo: {
    flex: 1,
  },
  incomeSource: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '600',
    marginBottom: 4,
  },
  incomeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  incomeDate: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  incomeDot: {
    fontSize: 10,
    color: '#999',
  },
  recurringBadge: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '600',
  },
  incomeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  itemActions: {
    alignItems: 'flex-end',
  },
  swipeAction: {
    backgroundColor: '#FFE8E8',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginVertical: 2,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  swipeDeleteIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  swipeDeleteText: {
    color: '#D32F2F',
    fontWeight: '700',
    fontSize: 12,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  warningsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  warningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  warningLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  warningIcon: {
    fontSize: 24,
  },
  warningInfo: {
    flex: 1,
  },
  warningCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  warningBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  warningBadgeWarning: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  warningBadgeDanger: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warningBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  warningBadgeTextWarning: {
    color: '#C2410C',
  },
  warningBadgeTextDanger: {
    color: '#DC2626',
  },
});