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
import { MonthlyReport, MainCategoryNames } from '../../types';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

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

            const [current, previous, trendData] = await Promise.all([
                budgetService.getMonthlyReport(user.uid, year, month),
                budgetService.getMonthlyReport(user.uid, prevYear, prevMonth),
                budgetService.getSpendingTrend(user.uid)
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
    footer: {
        height: 60,
    },
});