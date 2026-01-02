import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Animated,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { budgetService } from '../../services/budgetService';
import { incomeService } from '../../services/incomeService';
import { debtService } from '../../services/debtService';
import { goalService } from '../../services/goalService';
import { recurringExpenseService } from '../../services/recurringExpenseService';
import { MonthlyReport, MainCategoryNames, Income, DebtNote, DebtStatus, SavingGoal, GoalStatus, RecurringExpense, RecurringStatus } from '../../types';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';

interface CategoryData {
    name: string;
    amount: number;
    color: string;
    percentage: number;
}

export default function ReportsScreen() {
    const { user, userProfile } = useAuth();
    const router = useRouter();
    const [currentReport, setCurrentReport] = useState<MonthlyReport | null>(null);
    const [previousReport, setPreviousReport] = useState<MonthlyReport | null>(null);
    const [trend, setTrend] = useState<{ months: string[]; expenses: number[]; incomes: number[] } | null>(null);
    const [recentIncomes, setRecentIncomes] = useState<Income[]>([]);
    const [debts, setDebts] = useState<DebtNote[]>([]);
    const [goals, setGoals] = useState<SavingGoal[]>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        loadReports();
    }, [user, userProfile]);

    useFocusEffect(
        useCallback(() => {
            if (user && userProfile) {
                loadReports();
            }
        }, [user, userProfile])
    );

    const loadReports = useCallback(async (isRefreshing = false) => {
        if (!user || !userProfile) return;

        if (!isRefreshing) setLoading(true);
        setError(null);

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

            const [current, previous, trendData, incomes, allDebts, allGoals, allRecurring] = await Promise.all([
                budgetService.getMonthlyReport(user.uid, year, month),
                budgetService.getMonthlyReport(user.uid, prevYear, prevMonth),
                budgetService.getSpendingTrend(user.uid),
                incomeService.getMonthlyIncomes(user.uid, year, month),
                debtService.getDebts(user.uid),
                goalService.getGoals(user.uid),
                recurringExpenseService.getRecurringExpenses(user.uid)
            ]);

            // Aylık bütçeyi gelire ekle
            current.totalIncome += userProfile.monthlyBudget;
            current.balance = current.totalIncome - current.totalExpenses;

            if (previous) {
                previous.totalIncome += userProfile.monthlyBudget;
                previous.balance = previous.totalIncome - previous.totalExpenses;
            }

            setCurrentReport(current);
            setPreviousReport(previous);
            setTrend(trendData);
            setRecentIncomes(incomes.slice(0, 5));
            setDebts(allDebts);
            setGoals(allGoals);
            setRecurringExpenses(allRecurring);

            // Animasyon başlat
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        } catch (err) {
            console.error('Error loading reports:', err);
            setError('Raporlar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
            Alert.alert('Hata', 'Raporlar yüklenirken bir sorun oluştu.');
        } finally {
            setLoading(false);
            if (isRefreshing) setRefreshing(false);
        }
    }, [user, userProfile, fadeAnim]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadReports(true);
    }, [loadReports]);

    // Kategori verilerini hesapla ve önbelleğe al
    const categoryData = useMemo<CategoryData[]>(() => {
        if (!currentReport || currentReport.totalExpenses === 0) return [];

        return Object.entries(currentReport.categoryBreakdown)
            .filter(([_, amount]) => amount > 0)
            .map(([category, amount]) => ({
                name: MainCategoryNames[category as keyof typeof MainCategoryNames]?.split(' ')[1] || category,
                amount,
                color: getCategoryColor(category),
                percentage: (amount / currentReport.totalExpenses) * 100,
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [currentReport]);

    // Harcama değişimini hesapla
    const expenseChange = useMemo(() => {
        if (!previousReport || previousReport.totalExpenses === 0) return null;
        return ((currentReport!.totalExpenses - previousReport.totalExpenses) / previousReport.totalExpenses) * 100;
    }, [currentReport, previousReport]);

    // Günlük harcamaları sırala
    const sortedDailyExpenses = useMemo(() => {
        if (!currentReport?.dailyExpenses) return [];

        const maxExpense = Math.max(...Object.values(currentReport.dailyExpenses));

        return Object.entries(currentReport.dailyExpenses)
            .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
            .map(([date, amount]) => {
                const dateObj = new Date(date);
                return {
                    date,
                    dateObj,
                    amount,
                    dayName: dateObj.toLocaleDateString('tr-TR', { weekday: 'short' }),
                    dayNum: dateObj.getDate(),
                    isToday: dateObj.toDateString() === new Date().toDateString(),
                    percentage: maxExpense > 0 ? (amount / maxExpense) * 100 : 0,
                };
            });
    }, [currentReport]);

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
                        loadReports();
                    } catch (err) {
                        Alert.alert('Hata', 'Gelir silinirken bir sorun oluştu');
                    }
                }
            }
        ]);
    };

    const renderDeleteAction = (onPress: () => void) => (
        <TouchableOpacity style={styles.swipeAction} onPress={onPress} activeOpacity={0.8}>
            <Text style={styles.swipeDeleteIcon}>🗑️</Text>
            <Text style={styles.swipeDeleteText}>Sil</Text>
        </TouchableOpacity>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Raporlar yükleniyor...</Text>
            </View>
        );
    }

    if (error && !currentReport) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => loadReports()}>
                    <Text style={styles.retryButtonText}>Tekrar Dene</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!currentReport) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyTitle}>Henüz veri yok</Text>
                <Text style={styles.emptyText}>İşlem ekleyerek raporlarınızı görüntüleyin</Text>
            </View>
        );
    }

    const hasData = currentReport.totalExpenses > 0 || currentReport.totalIncome > 0;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#007AFF']}
                    tintColor="#007AFF"
                />
            }
            showsVerticalScrollIndicator={false}
        >
            <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>📊 Raporlar</Text>
                    <Text style={styles.subtitle}>
                        {new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                    </Text>
                </View>

                {!hasData ? (
                    <View style={styles.noDataContainer}>
                        <Text style={styles.noDataIcon}>💰</Text>
                        <Text style={styles.noDataTitle}>Bu ay henüz işlem yok</Text>
                        <Text style={styles.noDataText}>Gelir veya gider eklediğinizde raporlar burada görünecek</Text>
                    </View>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <View style={styles.summaryCards}>
                            <View style={[styles.summaryCard, styles.incomeCard]}>
                                <Text style={styles.summaryLabel}>Gelir</Text>
                                <Text style={styles.summaryAmount}>₺{currentReport.totalIncome.toLocaleString('tr-TR')}</Text>
                            </View>

                            <View style={[styles.summaryCard, styles.expenseCard]}>
                                <Text style={styles.summaryLabel}>Gider</Text>
                                <Text style={styles.summaryAmount}>₺{currentReport.totalExpenses.toLocaleString('tr-TR')}</Text>
                                {expenseChange !== null && (
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
                                    ₺{currentReport.balance.toLocaleString('tr-TR')}
                                </Text>
                            </View>
                        </View>

                        {/* Recent Incomes */}
                        {recentIncomes.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionTitle}>💼 Bu Ayki Gelirler</Text>
                                    <TouchableOpacity onPress={() => router.push('/incomes/list')} activeOpacity={0.7}>
                                        <Text style={styles.seeAllText}>Tümünü Gör →</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.chartContainer}>
                                    {recentIncomes.map((income, index) => (
                                        <View key={income.id}>
                                            <Swipeable
                                                renderRightActions={() => renderDeleteAction(() => confirmDeleteIncome(income.id))}
                                                overshootRight={false}
                                            >
                                                <View style={styles.incomeItem}>
                                                    <View style={styles.incomeLeft}>
                                                        <View style={styles.incomeIconContainer}>
                                                            <Text style={styles.incomeIcon}>💰</Text>
                                                        </View>
                                                        <View style={styles.incomeInfo}>
                                                            <Text style={styles.incomeSource}>{income.source}</Text>
                                                            <View style={styles.incomeMeta}>
                                                                <Text style={styles.incomeDate}>
                                                                    {income.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                                                </Text>
                                                                {income.isRecurring && (
                                                                    <>
                                                                        <Text style={styles.incomeDot}>•</Text>
                                                                        <Text style={styles.recurringBadge}>🔄 Düzenli</Text>
                                                                    </>
                                                                )}
                                                            </View>
                                                        </View>
                                                    </View>
                                                    <Text style={styles.incomeAmount}>
                                                        +₺{income.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                    </Text>
                                                </View>
                                            </Swipeable>
                                            {index < recentIncomes.length - 1 && <View style={styles.itemDivider} />}
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Daily Expenses */}
                        {sortedDailyExpenses.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>📅 Günlük Harcamalar</Text>
                                <View style={styles.chartContainer}>
                                    {sortedDailyExpenses.map((item) => (
                                        <TouchableOpacity
                                            key={item.date}
                                            style={[styles.dailyRow, item.isToday && styles.dailyRowToday]}
                                            onPress={() => router.push(`/expenses/list?date=${item.date}`)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.dailyDate}>
                                                <Text style={[styles.dayName, item.isToday && styles.todayText]}>
                                                    {item.dayName}
                                                </Text>
                                                <Text style={[styles.dayNum, item.isToday && styles.todayText]}>
                                                    {item.dayNum}
                                                </Text>
                                            </View>
                                            <View style={styles.dailyBar}>
                                                <View
                                                    style={[
                                                        styles.dailyBarFill,
                                                        { width: `${Math.min(item.percentage, 100)}%` },
                                                        item.isToday && styles.dailyBarToday
                                                    ]}
                                                />
                                            </View>
                                            <Text style={[styles.dailyAmount, item.isToday && styles.todayText]}>
                                                ₺{item.amount.toLocaleString('tr-TR')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Category Breakdown */}
                        {categoryData.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>🏷️ Kategori Dağılımı</Text>
                                <View style={styles.chartContainer}>
                                    {categoryData.map((item, index) => (
                                        <View key={index} style={styles.categoryRow}>
                                            <View style={styles.categoryInfo}>
                                                <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                                                <Text style={styles.categoryLabel}>{item.name}</Text>
                                            </View>
                                            <View style={styles.categoryAmountContainer}>
                                                <Text style={styles.categoryPercent}>{item.percentage.toFixed(1)}%</Text>
                                                <Text style={styles.categoryValue}>₺{item.amount.toLocaleString('tr-TR')}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Spending Trend */}
                        {trend && trend.expenses.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>📈 Harcama Trendi (Son 6 Ay)</Text>
                                <View style={styles.chartContainer}>
                                    <View style={styles.trendChart}>
                                        {trend.months.map((month, index) => {
                                            const expense = trend.expenses[index];
                                            const maxExpense = Math.max(...trend.expenses);
                                            const barHeight = maxExpense > 0 ? (expense / maxExpense) * 150 : 5;
                                            const monthLabel = month.split('-')[1] + '/' + month.split('-')[0].slice(2);

                                            return (
                                                <View key={index} style={styles.trendItem}>
                                                    <View style={styles.barContainer}>
                                                        <View style={[styles.bar, { height: barHeight }]} />
                                                    </View>
                                                    <Text style={styles.trendLabel}>{monthLabel}</Text>
                                                    <Text style={styles.trendValue}>₺{expense.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</Text>
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
                                <Text style={styles.sectionTitle}>🔝 En Yüksek Harcamalar</Text>
                                {currentReport.topExpenses.slice(0, 5).map((expense, index) => (
                                    <View key={expense.id} style={styles.topExpenseItem}>
                                        <View style={[
                                            styles.topExpenseRank,
                                            index === 0 && styles.topExpenseRankFirst
                                        ]}>
                                            <Text style={styles.rankText}>{index + 1}</Text>
                                        </View>
                                        <View style={styles.topExpenseInfo}>
                                            <Text style={styles.topExpenseName} numberOfLines={1}>
                                                {expense.note || 'Not yok'}
                                            </Text>
                                            <Text style={styles.topExpenseDate}>
                                                {expense.date.toLocaleDateString('tr-TR', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </Text>
                                        </View>
                                        <Text style={styles.topExpenseAmount}>
                                            ₺{expense.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Average Daily Spending */}
                        {currentReport.totalExpenses > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>📊 Günlük Ortalamalar</Text>
                                <View style={styles.chartContainer}>
                                    <View style={styles.statsGrid}>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statIcon}>💸</Text>
                                            <Text style={styles.statLabel}>Ortalama Günlük</Text>
                                            <Text style={styles.statValue}>
                                                ₺{(currentReport.totalExpenses / new Date().getDate()).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                                            </Text>
                                        </View>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statIcon}>📅</Text>
                                            <Text style={styles.statLabel}>Aylık Tahmini</Text>
                                            <Text style={styles.statValue}>
                                                ₺{((currentReport.totalExpenses / new Date().getDate()) * 30).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.statsGrid}>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statIcon}>🎯</Text>
                                            <Text style={styles.statLabel}>Kalan Bütçe</Text>
                                            <Text style={[
                                                styles.statValue,
                                                currentReport.balance < 0 && styles.negativeBalance
                                            ]}>
                                                ₺{currentReport.balance.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                                            </Text>
                                        </View>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statIcon}>⏳</Text>
                                            <Text style={styles.statLabel}>Kalan Gün</Text>
                                            <Text style={styles.statValue}>
                                                {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()} gün
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Recurring Expenses Summary */}
                        {recurringExpenses.filter(r => r.status === RecurringStatus.ACTIVE).length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionTitle}>🔄 Tekrarlayan Harcamalar</Text>
                                    <TouchableOpacity onPress={() => router.push('/recurring/list')} activeOpacity={0.7}>
                                        <Text style={styles.seeAllText}>Tümünü Gör →</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.chartContainer}>
                                    <View style={styles.recurringHeader}>
                                        <Text style={styles.recurringTitle}>Aylık Sabit Giderler</Text>
                                        <Text style={styles.recurringTotal}>
                                            ₺{recurringExpenses
                                                .filter(r => r.status === RecurringStatus.ACTIVE)
                                                .reduce((sum, r) => sum + r.amount, 0)
                                                .toLocaleString('tr-TR')}
                                        </Text>
                                    </View>
                                    {recurringExpenses
                                        .filter(r => r.status === RecurringStatus.ACTIVE)
                                        .slice(0, 4)
                                        .map((recurring) => {
                                            const daysUntil = Math.ceil((recurring.nextDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                            return (
                                                <View key={recurring.id} style={styles.recurringItem}>
                                                    <View style={styles.recurringLeft}>
                                                        <Text style={styles.recurringName}>{recurring.title}</Text>
                                                        <Text style={styles.recurringDate}>
                                                            {daysUntil <= 0 ? 'Bugün' : `${daysUntil} gün içinde`}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.recurringAmount}>₺{recurring.amount.toLocaleString('tr-TR')}</Text>
                                                </View>
                                            );
                                        })}
                                </View>
                            </View>
                        )}

                        {/* Goals Summary */}
                        {goals.filter(g => g.status === GoalStatus.ACTIVE).length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionTitle}>🎯 Tasarruf Hedefleri</Text>
                                    <TouchableOpacity onPress={() => router.push('/(tabs)/goals')} activeOpacity={0.7}>
                                        <Text style={styles.seeAllText}>Tümünü Gör →</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.chartContainer}>
                                    {goals
                                        .filter(g => g.status === GoalStatus.ACTIVE)
                                        .slice(0, 3)
                                        .map((goal) => {
                                            const progress = (goal.currentAmount / goal.targetAmount) * 100;
                                            return (
                                                <View key={goal.id} style={styles.goalItem}>
                                                    <View style={styles.goalHeader}>
                                                        <Text style={styles.goalTitle}>{goal.title}</Text>
                                                        <Text style={styles.goalProgress}>{progress.toFixed(0)}%</Text>
                                                    </View>
                                                    <View style={styles.goalProgressBar}>
                                                        <View style={[styles.goalProgressFill, { width: `${Math.min(progress, 100)}%` }]} />
                                                    </View>
                                                    <View style={styles.goalAmounts}>
                                                        <Text style={styles.goalAmount}>₺{goal.currentAmount.toLocaleString('tr-TR')}</Text>
                                                        <Text style={styles.goalTarget}>/ ₺{goal.targetAmount.toLocaleString('tr-TR')}</Text>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                </View>
                            </View>
                        )}

                        {/* Debts Summary */}
                        {debts.filter(d => d.status === DebtStatus.OPEN).length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionTitle}>💳 Borç/Alacak Durumu</Text>
                                    <TouchableOpacity onPress={() => router.push('/(tabs)/debts')} activeOpacity={0.7}>
                                        <Text style={styles.seeAllText}>Tümünü Gör →</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.chartContainer}>
                                    <View style={styles.debtSummaryRow}>
                                        <View style={styles.debtSummaryCard}>
                                            <Text style={styles.debtSummaryIcon}>🔴</Text>
                                            <Text style={styles.debtSummaryLabel}>Borçlar</Text>
                                            <Text style={styles.debtSummaryAmount}>
                                                ₺{debts
                                                    .filter(d => d.status === DebtStatus.OPEN && d.direction === 'OWING')
                                                    .reduce((sum, d) => sum + d.amount, 0)
                                                    .toLocaleString('tr-TR')}
                                            </Text>
                                        </View>
                                        <View style={styles.debtSummaryCard}>
                                            <Text style={styles.debtSummaryIcon}>🟢</Text>
                                            <Text style={styles.debtSummaryLabel}>Alacaklar</Text>
                                            <Text style={styles.debtSummaryAmount}>
                                                ₺{debts
                                                    .filter(d => d.status === DebtStatus.OPEN && d.direction === 'OWED')
                                                    .reduce((sum, d) => sum + d.amount, 0)
                                                    .toLocaleString('tr-TR')}
                                            </Text>
                                        </View>
                                    </View>
                                    {debts
                                        .filter(d => d.status === DebtStatus.OPEN)
                                        .slice(0, 3)
                                        .map((debt) => (
                                            <View key={debt.id} style={styles.debtItem}>
                                                <View style={styles.debtLeft}>
                                                    <Text style={styles.debtIcon}>{debt.direction === 'OWING' ? '🔴' : '🟢'}</Text>
                                                    <View>
                                                        <Text style={styles.debtCounterparty}>{debt.counterparty}</Text>
                                                        {debt.dueDate && (
                                                            <Text style={styles.debtDueDate}>
                                                                Vade: {debt.dueDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>
                                                <Text style={[
                                                    styles.debtAmount,
                                                    debt.direction === 'OWING' ? styles.debtOwing : styles.debtOwed
                                                ]}>
                                                    {debt.direction === 'OWING' ? '-' : '+'}₺{debt.amount.toLocaleString('tr-TR')}
                                                </Text>
                                            </View>
                                        ))}
                                </View>
                            </View>
                        )}

                        {/* Income vs Expense Projection */}
                        {trend && trend.expenses.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>📈 Gelir/Gider Dengesi</Text>
                                <View style={styles.chartContainer}>
                                    <View style={styles.projectionChart}>
                                        {trend.months.slice(-6).map((month, index) => {
                                            const expense = trend.expenses[trend.expenses.length - 6 + index] || 0;
                                            const income = trend.incomes[trend.incomes.length - 6 + index] || 0;
                                            const maxValue = Math.max(...trend.expenses, ...trend.incomes);
                                            const expenseHeight = maxValue > 0 ? (expense / maxValue) * 100 : 5;
                                            const incomeHeight = maxValue > 0 ? (income / maxValue) * 100 : 5;
                                            const monthLabel = month.split('-')[1] + '/' + month.split('-')[0].slice(2);

                                            return (
                                                <View key={index} style={styles.projectionItem}>
                                                    <View style={styles.projectionBars}>
                                                        <View style={[styles.projectionBar, styles.incomeBar, { height: incomeHeight }]} />
                                                        <View style={[styles.projectionBar, styles.expenseBar, { height: expenseHeight }]} />
                                                    </View>
                                                    <Text style={styles.projectionLabel}>{monthLabel}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                    <View style={styles.projectionLegend}>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
                                            <Text style={styles.legendText}>Gelir</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} />
                                            <Text style={styles.legendText}>Gider</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}
                    </>
                )}

                {/* Footer spacing */}
                <View style={styles.footer} />
            </Animated.View>
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
    contentContainer: {
        paddingBottom: 20,
    },
    animatedContainer: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#f5f5f5',
    },
    errorIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#f5f5f5',
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    noDataContainer: {
        alignItems: 'center',
        padding: 40,
        marginTop: 40,
    },
    noDataIcon: {
        fontSize: 72,
        marginBottom: 16,
    },
    noDataTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    noDataText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    header: {
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
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
        textTransform: 'capitalize',
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
        elevation: 3,
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
        fontWeight: '500',
    },
    summaryAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    negativeBalance: {
        color: '#FFD60A',
    },
    changeText: {
        fontSize: 11,
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
        marginBottom: 12,
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
        fontWeight: '500',
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
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dailyRowToday: {
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
        paddingHorizontal: 8,
        marginVertical: 2,
        borderBottomWidth: 0,
    },
    dailyDate: {
        width: 50,
        alignItems: 'center',
        marginRight: 12,
    },
    dayName: {
        fontSize: 11,
        color: '#999',
        textTransform: 'uppercase',
        fontWeight: '600',
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
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
        minWidth: 80,
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
        marginHorizontal: 2,
    },
    barContainer: {
        height: 150,
        justifyContent: 'flex-end',
        marginBottom: 8,
    },
    bar: {
        width: 28,
        backgroundColor: '#FF3B30',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        minHeight: 5,
    },
    trendLabel: {
        fontSize: 10,
        color: '#666',
        marginBottom: 4,
        fontWeight: '600',
    },
    trendValue: {
        fontSize: 10,
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
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    topExpenseRankFirst: {
        backgroundColor: '#FFD700',
    },
    rankText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    topExpenseInfo: {
        flex: 1,
        marginRight: 8,
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
        fontSize: 17,
        fontWeight: 'bold',
        color: '#FF3B30',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    seeAllText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '600',
    },
    incomeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        backgroundColor: '#fff',
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
    itemDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 4,
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
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    statIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 11,
        color: '#666',
        marginBottom: 6,
        textAlign: 'center',
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    recurringHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 2,
        borderBottomColor: '#E0E0E0',
    },
    recurringTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#333',
    },
    recurringTotal: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FF3B30',
    },
    recurringItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    recurringLeft: {
        flex: 1,
    },
    recurringName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    recurringDate: {
        fontSize: 12,
        color: '#999',
    },
    recurringAmount: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#FF3B30',
    },
    goalItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    goalTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    goalProgress: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    goalProgressBar: {
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 6,
    },
    goalProgressFill: {
        height: '100%',
        backgroundColor: '#34C759',
        borderRadius: 4,
    },
    goalAmounts: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    goalAmount: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#34C759',
    },
    goalTarget: {
        fontSize: 12,
        color: '#999',
        marginLeft: 4,
    },
    debtSummaryRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    debtSummaryCard: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    debtSummaryIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    debtSummaryLabel: {
        fontSize: 11,
        color: '#666',
        marginBottom: 6,
    },
    debtSummaryAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    debtItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    debtLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    debtIcon: {
        fontSize: 20,
    },
    debtCounterparty: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    debtDueDate: {
        fontSize: 11,
        color: '#999',
    },
    debtAmount: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    debtOwing: {
        color: '#FF3B30',
    },
    debtOwed: {
        color: '#34C759',
    },
    projectionChart: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 120,
        marginBottom: 16,
    },
    projectionItem: {
        flex: 1,
        alignItems: 'center',
    },
    projectionBars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 100,
        gap: 4,
        marginBottom: 8,
    },
    projectionBar: {
        width: 12,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
        minHeight: 5,
    },
    incomeBar: {
        backgroundColor: '#34C759',
    },
    expenseBar: {
        backgroundColor: '#FF3B30',
    },
    projectionLabel: {
        fontSize: 10,
        color: '#666',
        fontWeight: '600',
    },
    projectionLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    footer: {
        height: 60,
    },
});