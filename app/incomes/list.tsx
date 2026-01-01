import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { incomeService } from '../../services/incomeService';
import { Income } from '../../types';
import { useRouter } from 'expo-router';

export default function IncomeListScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    useFocusEffect(
        React.useCallback(() => {
            loadIncomes();
        }, [selectedMonth])
    );

    const loadIncomes = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth() + 1;
            const data = await incomeService.getMonthlyIncomes(user.uid, year, month);
            setIncomes(data);
        } catch (error) {
            console.error('Error loading incomes:', error);
        } finally {
            setLoading(false);
        }
    };

    const previousMonth = () => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() - 1);
        setSelectedMonth(newDate);
    };

    const nextMonth = () => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() + 1);
        
        // Gelecek aya geçişi engelle
        const now = new Date();
        if (newDate <= new Date(now.getFullYear(), now.getMonth() + 1)) {
            setSelectedMonth(newDate);
        }
    };

    const monthName = selectedMonth.toLocaleDateString('tr-TR', {
        month: 'long',
        year: 'numeric'
    });

    const totalAmount = incomes.reduce((sum, inc) => sum + inc.amount, 0);

    // Tarih formatlama fonksiyonu (Firebase Timestamp koruması)
    const formatDate = (date: any) => {
        try {
            // Eğer Firebase'den geliyorsa .toDate() kullan, yoksa normal Date kullan
            const d = date?.toDate ? date.toDate() : new Date(date);
            return d.toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Tarih belirsiz';
        }
    };

    if (loading && incomes.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#34C759" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Back Button */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Geri</Text>
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Gelirler Listesi</Text>
                <View style={styles.headerSpacer} />
            </View>
            
            {/* Month Selector */}
            <View style={styles.monthSelector}>
                <TouchableOpacity onPress={previousMonth} style={styles.monthButton}>
                    <Text style={styles.monthButtonText}>◀</Text>
                </TouchableOpacity>
                <Text style={styles.monthText}>{monthName}</Text>
                <TouchableOpacity
                    onPress={nextMonth}
                    style={styles.monthButton}
                    disabled={
                        selectedMonth.getMonth() === new Date().getMonth() &&
                        selectedMonth.getFullYear() === new Date().getFullYear()
                    }
                >
                    <Text style={[
                        styles.monthButtonText, 
                        (selectedMonth.getMonth() === new Date().getMonth() && { color: '#ccc' })
                    ]}>▶</Text>
                </TouchableOpacity>
            </View>

            {/* Total */}
            <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Toplam Gelir</Text>
                <Text style={styles.totalAmount}>+₺{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text>
            </View>

            {/* Income List */}
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {incomes.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>Bu ay henüz gelir yok</Text>
                    </View>
                ) : (
                    incomes.map((income) => (
                        <View key={income.id} style={styles.incomeCard}>
                            <View style={styles.incomeHeader}>
                                <View style={styles.incomeCategory}>
                                    <Text style={styles.categoryIcon}>💰</Text>
                                    <View style={styles.incomeInfo}>
                                        <Text style={styles.categoryName}>
                                            {income.source}
                                        </Text>
                                        <View style={styles.incomeMeta}>
                                            <Text style={styles.incomeDate}>
                                                {formatDate(income.date)}
                                            </Text>
                                            {income.isRecurring && (
                                                <>
                                                    <Text style={styles.metaDot}>•</Text>
                                                    <Text style={styles.recurringBadge}>🔄 Düzenli</Text>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                </View>
                                <Text style={styles.incomeAmount}>+₺{income.amount.toFixed(2)}</Text>
                            </View>
                            
                            {income.note ? (
                                <Text style={styles.incomeNote}>{income.note}</Text>
                            ) : null}
                        </View>
                    ))
                )}
                <View style={{ height: 80 }} /> 
            </ScrollView>

            {/* Add Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/incomes/add')}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 4,
    },
    backButtonText: {
        fontSize: 15,
        color: '#007AFF',
        fontWeight: '600',
    },
    topBarTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    headerSpacer: {
        width: 60,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    monthButton: {
        padding: 12,
    },
    monthButtonText: {
        fontSize: 20,
        color: '#34C759',
    },
    monthText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    totalCard: {
        margin: 20,
        padding: 20,
        backgroundColor: '#34C759',
        borderRadius: 12,
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 8,
    },
    totalAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    list: {
        flex: 1,
        paddingHorizontal: 20,
    },
    incomeCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    incomeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    incomeCategory: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    incomeInfo: {
        flex: 1,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    incomeMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaDot: {
        fontSize: 12,
        color: '#999',
        marginHorizontal: 6,
    },
    incomeDate: {
        fontSize: 12,
        color: '#999',
    },
    recurringBadge: {
        fontSize: 12,
        color: '#34C759',
        fontWeight: '500',
    },
    incomeAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#34C759',
    },
    incomeNote: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#999',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#34C759',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    fabText: {
        fontSize: 32,
        color: '#fff',
        fontWeight: '300',
    },
});
