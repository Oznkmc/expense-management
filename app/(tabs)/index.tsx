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
  Modal
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { budgetService } from '../../services/budgetService';
import { expenseService } from '../../services/expenseService';
import { incomeService } from '../../services/incomeService';
import { BudgetSummary, Expense, MainCategoryNames, Income } from '../../types';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen() {
  const { user, userProfile } = useAuth();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [recentIncomes, setRecentIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const router = useRouter();

  const loadData = async () => {
    if (!user || !userProfile) return;

    try {
      const [budgetSummary, expenses, incomes] = await Promise.all([
        budgetService.getBudgetSummary(user.uid, userProfile.monthlyBudget),
        expenseService.getRecentExpenses(user.uid, 5),
        incomeService.getMonthlyIncomes(user.uid, new Date().getFullYear(), new Date().getMonth() + 1)
      ]);

      setSummary(budgetSummary);
      setRecentExpenses(expenses);
      setRecentIncomes(incomes.slice(0, 5));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // İlk yükleme
  useEffect(() => {
    loadData();
  }, [user, userProfile]);

  // Her sayfa görüntülendiğinde yenile
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!summary) return null;

  const budgetPercentage = (summary.totalExpenses / (summary.totalBudget + summary.totalIncome)) * 100;
  const isOverBudget = summary.remaining < 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Merhaba, {userProfile?.displayName} 👋
        </Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('tr-TR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </Text>
      </View>

      {/* Main Budget Card */}
      <View style={[styles.budgetCard, isOverBudget && styles.budgetCardDanger]}>
        <View style={styles.budgetHeader}>
          <Text style={styles.budgetLabel}>Kalan Bütçe</Text>
          <Text style={styles.daysLeft}>{summary.daysLeft} gün kaldı</Text>
        </View>
        
        <Text style={[styles.budgetAmount, isOverBudget && styles.budgetAmountDanger]}>
          ₺{summary.remaining.toFixed(2)}
        </Text>
        
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${Math.min(budgetPercentage, 100)}%` },
              isOverBudget && styles.progressFillDanger
            ]} 
          />
        </View>
        
        <View style={styles.budgetStats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Gelir</Text>
            <Text style={styles.statValue}>₺{summary.totalIncome.toFixed(0)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Harcama</Text>
            <Text style={styles.statValue}>₺{summary.totalExpenses.toFixed(0)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Günlük Limit</Text>
            <Text style={styles.statValue}>₺{summary.dailyAverage.toFixed(0)}</Text>
          </View>
        </View>
      </View>

      {/* Quick Add Button */}
      <TouchableOpacity 
        style={styles.quickAddButton}
        onPress={() => router.push('/expenses/add')}
      >
        <Text style={styles.quickAddText}>+ Hızlı Harcama Ekle</Text>
      </TouchableOpacity>

      {/* Income Add Button */}
      <TouchableOpacity 
        style={styles.incomeAddButton}
        onPress={() => router.push('/incomes/add')}
      >
        <Text style={styles.incomeAddText}>+ Gelir Ekle</Text>
      </TouchableOpacity>

      {/* Recent Incomes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bu Ayki Gelirler</Text>
        {recentIncomes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Henüz gelir yok</Text>
            <Text style={styles.emptyStateSubtext}>İlk gelirini ekleyerek başla!</Text>
          </View>
        ) : (
          recentIncomes.map((income) => (
            <View key={income.id} style={styles.incomeItem}>
              <View style={styles.incomeInfo}>
                <Text style={styles.incomeSource}>
                  {income.source}
                </Text>
                <Text style={styles.incomeDate}>
                  {income.date.toLocaleDateString('tr-TR')}
                  {income.isRecurring && ' • Düzenli'}
                </Text>
              </View>
              <Text style={styles.incomeAmount}>+₺{income.amount.toFixed(2)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Category Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kategori Özeti</Text>
        <View style={styles.categoriesGrid}>
          {Object.entries(summary.categoryExpenses).map(([category, amount]) => {
            if (amount === 0) return null;
            return (
              <View key={category} style={styles.categoryCard}>
                <Text style={styles.categoryName}>
                  {MainCategoryNames[category as keyof typeof MainCategoryNames]}
                </Text>
                <Text style={styles.categoryAmount}>₺{amount.toFixed(0)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Recent Expenses */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Son Harcamalar</Text>
          <TouchableOpacity onPress={() => router.push('/expenses/list')}>
            <Text style={styles.seeAllText}>Tümünü Gör</Text>
          </TouchableOpacity>
        </View>
        
        {recentExpenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Henüz harcama yok</Text>
            <Text style={styles.emptyStateSubtext}>İlk harcamanı ekleyerek başla!</Text>
          </View>
        ) : (
          recentExpenses.map((expense) => (
            <View key={expense.id} style={styles.expenseItem}>
              {expense.photoURL && (
                <TouchableOpacity onPress={() => setSelectedImage(expense.photoURL!)}>
                  <Image 
                    source={{ uri: expense.photoURL }} 
                    style={styles.expenseThumb}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseNote}>
                  {expense.note || 'Not yok'}
                </Text>
                <Text style={styles.expenseDate}>
                  {expense.date.toLocaleDateString('tr-TR')}
                </Text>
              </View>
              <Text style={styles.expenseAmount}>₺{expense.amount.toFixed(2)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Image Viewer Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        onRequestClose={() => setSelectedImage(null)}
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
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  budgetCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  budgetCardDanger: {
    backgroundColor: '#FF3B30',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  daysLeft: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  budgetAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  budgetAmountDanger: {
    color: '#fff',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  progressFillDanger: {
    backgroundColor: '#FFD60A',
  },
  budgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  quickAddButton: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    backgroundColor: '#34C759',
    borderRadius: 12,
    alignItems: 'center',
  },
  quickAddText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  incomeAddButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  incomeAddText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  categoryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  expenseThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseNote: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 12,
    color: '#999',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  incomeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  incomeInfo: {
    flex: 1,
  },
  incomeSource: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
    fontWeight: '600',
  },
  incomeDate: {
    fontSize: 12,
    color: '#999',
  },
  incomeAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});
