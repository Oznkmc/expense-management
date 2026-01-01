import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { budgetService } from '../../services/budgetService';
import { expenseService } from '../../services/expenseService';
import { BudgetSummary, Expense, MainCategoryNames } from '../../types';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen() {
  const { user, userProfile } = useAuth();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadData = async () => {
    if (!user || !userProfile) return;

    try {
      const [budgetSummary, expenses] = await Promise.all([
        budgetService.getBudgetSummary(user.uid, userProfile.monthlyBudget),
        expenseService.getRecentExpenses(user.uid, 5)
      ]);

      setSummary(budgetSummary);
      setRecentExpenses(expenses);
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
    marginBottom: 20,
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
    marginHorizontal: -6,
  },
  categoryCard: {
    width: '47%',
    margin: 6,
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
});
