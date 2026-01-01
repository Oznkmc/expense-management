import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { budgetService } from '../../services/budgetService';
import { MonthlyReport, MainCategoryNames } from '../../types';
import { useFocusEffect } from '@react-navigation/native';

export default function ReportsScreen() {
  const { user, userProfile } = useAuth();
  const [currentReport, setCurrentReport] = useState<MonthlyReport | null>(null);
  const [previousReport, setPreviousReport] = useState<MonthlyReport | null>(null);
  const [trend, setTrend] = useState<{ months: string[]; expenses: number[]; incomes: number[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [user, userProfile]);

  // Sayfa görüntülendiğinde yenile
  useFocusEffect(
    React.useCallback(() => {
      if (user && userProfile) {
        loadReports();
      }
    }, [user, userProfile])
  );

  const loadReports = async () => {
    if (!user || !userProfile) return;

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      let prevYear = year;
      let prevMonth = month - 1;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
      }

      const [current, previous, trendData] = await Promise.all([
        budgetService.getMonthlyReport(user.uid, year, month),
        budgetService.getMonthlyReport(user.uid, prevYear, prevMonth),
        budgetService.getSpendingTrend(user.uid)
      ]);

      // Aylık bütçeyi gelire ekle
      current.totalIncome += userProfile.monthlyBudget;
      current.balance = current.totalIncome - current.totalExpenses;

      // Önceki ay için de bütçe ekle
      if (previous) {
        previous.totalIncome += userProfile.monthlyBudget;
        previous.balance = previous.totalIncome - previous.totalExpenses;
      }

      setCurrentReport(current);
      setPreviousReport(previous);
      setTrend(trendData);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!currentReport) return null;

  const categoryData = Object.entries(currentReport.categoryBreakdown)
    .filter(([_, amount]) => amount > 0)
    .map(([category, amount]) => ({
      name: MainCategoryNames[category as keyof typeof MainCategoryNames].split(' ')[1] || category,
      amount,
      color: getCategoryColor(category),
      legendFontColor: '#333',
      legendFontSize: 12
    }));

  const expenseChange = previousReport && previousReport.totalExpenses > 0
    ? ((currentReport.totalExpenses - previousReport.totalExpenses) / previousReport.totalExpenses) * 100
    : 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Raporlar</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryCards}>
        <View style={[styles.summaryCard, styles.incomeCard]}>
          <Text style={styles.summaryLabel}>Gelir</Text>
          <Text style={styles.summaryAmount}>₺{currentReport.totalIncome.toFixed(0)}</Text>
        </View>
        
        <View style={[styles.summaryCard, styles.expenseCard]}>
          <Text style={styles.summaryLabel}>Gider</Text>
          <Text style={styles.summaryAmount}>₺{currentReport.totalExpenses.toFixed(0)}</Text>
          {previousReport && (
            <Text style={[
              styles.changeText,
              expenseChange > 0 ? styles.changeNegative : styles.changePositive
            ]}>
              {expenseChange > 0 ? '↑' : '↓'} {Math.abs(expenseChange).toFixed(1)}%
            </Text>
          )}
        </View>
        
        <View style={[styles.summaryCard, styles.balanceCard]}>
          <Text style={styles.summaryLabel}>Bakiye</Text>
          <Text style={[
            styles.summaryAmount,
            currentReport.balance < 0 && styles.negativeBalance
          ]}>
            ₺{currentReport.balance.toFixed(0)}
          </Text>
        </View>
      </View>

      {/* Daily Expenses */}
      {currentReport.dailyExpenses && Object.keys(currentReport.dailyExpenses).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Günlük Harcamalar</Text>
          <View style={styles.chartContainer}>
            {Object.entries(currentReport.dailyExpenses)
              .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
              .map(([date, amount]) => {
                const dateObj = new Date(date);
                const dayName = dateObj.toLocaleDateString('tr-TR', { weekday: 'short' });
                const dayNum = dateObj.getDate();
                const isToday = dateObj.toDateString() === new Date().toDateString();
                
                return (
                  <View key={date} style={[styles.dailyRow, isToday && styles.dailyRowToday]}>
                    <View style={styles.dailyDate}>
                      <Text style={[styles.dayName, isToday && styles.todayText]}>{dayName}</Text>
                      <Text style={[styles.dayNum, isToday && styles.todayText]}>{dayNum}</Text>
                    </View>
                    <View style={styles.dailyBar}>
                      <View 
                        style={[
                          styles.dailyBarFill, 
                          { width: `${Math.min((amount / Math.max(...Object.values(currentReport.dailyExpenses))) * 100, 100)}%` },
                          isToday && styles.dailyBarToday
                        ]} 
                      />
                    </View>
                    <Text style={[styles.dailyAmount, isToday && styles.todayText]}>
                      ₺{amount.toFixed(0)}
                    </Text>
                  </View>
                );
              })}
          </View>
        </View>
      )}

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kategori Dağılımı</Text>
          <View style={styles.chartContainer}>
            {categoryData.map((item, index) => {
              const percentage = (item.amount / currentReport.totalExpenses) * 100;
              return (
                <View key={index} style={styles.categoryRow}>
                  <View style={styles.categoryInfo}>
                    <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                    <Text style={styles.categoryLabel}>{item.name}</Text>
                  </View>
                  <View style={styles.categoryAmountContainer}>
                    <Text style={styles.categoryPercent}>{percentage.toFixed(1)}%</Text>
                    <Text style={styles.categoryValue}>₺{item.amount.toFixed(0)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Spending Trend */}
      {trend && trend.expenses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Harcama Trendi (Son 6 Ay)</Text>
          <View style={styles.chartContainer}>
            <View style={styles.trendChart}>
              {trend.months.map((month, index) => {
                const expense = trend.expenses[index];
                const maxExpense = Math.max(...trend.expenses);
                const barHeight = maxExpense > 0 ? (expense / maxExpense) * 150 : 0;
                const monthLabel = month.split('-')[1] + '/' + month.split('-')[0].slice(2);
                
                return (
                  <View key={index} style={styles.trendItem}>
                    <View style={styles.barContainer}>
                      <View style={[styles.bar, { height: barHeight }]} />
                    </View>
                    <Text style={styles.trendLabel}>{monthLabel}</Text>
                    <Text style={styles.trendValue}>₺{expense.toFixed(0)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Top Expenses */}
      {currentReport.topExpenses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>En Yüksek Harcamalar</Text>
          {currentReport.topExpenses.slice(0, 5).map((expense, index) => (
            <View key={expense.id} style={styles.topExpenseItem}>
              <View style={styles.topExpenseRank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <View style={styles.topExpenseInfo}>
                <Text style={styles.topExpenseName}>
                  {expense.note || 'Not yok'}
                </Text>
                <Text style={styles.topExpenseDate}>
                  {expense.date.toLocaleDateString('tr-TR')}
                </Text>
              </View>
              <Text style={styles.topExpenseAmount}>
                ₺{expense.amount.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    food: '#FF6B6B',
    transport: '#4ECDC4',
    education: '#45B7D1',
    entertainment: '#FFA07A',
    clothing: '#98D8C8',
    communication: '#6C5CE7',
    health: '#FF6B9D',
    other: '#95A5A6'
  };
  return colors[category] || '#95A5A6';
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  summaryCards: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  incomeCard: {
    backgroundColor: '#34C759',
  },
  expenseCard: {
    backgroundColor: '#FF3B30',
  },
  balanceCard: {
    backgroundColor: '#007AFF',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  negativeBalance: {
    color: '#FFD60A',
  },
  changeText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  changePositive: {
    color: 'rgba(255,255,255,0.9)',
  },
  changeNegative: {
    color: '#FFD60A',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#333',
  },
  categoryAmountContainer: {
    alignItems: 'flex-end',
  },
  categoryPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  categoryValue: {
    fontSize: 12,
    color: '#666',
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dailyRowToday: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginVertical: 2,
  },
  dailyDate: {
    width: 50,
    alignItems: 'center',
    marginRight: 12,
  },
  dayName: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
  },
  dayNum: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  todayText: {
    color: '#007AFF',
  },
  dailyBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  dailyBarFill: {
    height: '100%',
    backgroundColor: '#FF3B30',
    borderRadius: 4,
  },
  dailyBarToday: {
    backgroundColor: '#007AFF',
  },
  dailyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 70,
    textAlign: 'right',
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingVertical: 10,
  },
  trendItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  barContainer: {
    height: 150,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: 30,
    backgroundColor: '#FF3B30',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 5,
  },
  trendLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  trendValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  topExpenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topExpenseRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  topExpenseInfo: {
    flex: 1,
  },
  topExpenseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  topExpenseDate: {
    fontSize: 12,
    color: '#999',
  },
  topExpenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
});
