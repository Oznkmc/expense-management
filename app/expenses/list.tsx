import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Modal
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { expenseService } from '../../services/expenseService';
import { Expense, CategoryNames, CategoryIcons } from '../../types';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ExpenseListScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams();
    const filterDate = params.date as string | undefined;
    
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        loadExpenses();
    }, [selectedMonth]);

    const loadExpenses = async () => {
        if (!user) return;

        try {
            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth() + 1;
            const data = await expenseService.getMonthlyExpenses(user.uid, year, month);
            
            // Filter by specific date if provided
            if (filterDate) {
                const filtered = data.filter(exp => {
                    const expDate = `${exp.date.getFullYear()}-${(exp.date.getMonth() + 1)
                        .toString()
                        .padStart(2, '0')}-${exp.date.getDate().toString().padStart(2, '0')}`;
                    return expDate === filterDate;
                });
                setExpenses(filtered);
            } else {
                setExpenses(data);
            }
        } catch (error) {
            console.error('Error loading expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const previousMonth = () => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() - 1);
        setSelectedMonth(newDate);
        setLoading(true);
    };

    const nextMonth = () => {
        const newDate = new Date(selectedMonth);
        newDate.setMonth(newDate.getMonth() + 1);
        if (newDate <= new Date()) {
            setSelectedMonth(newDate);
            setLoading(true);
        }
    };

    const monthName = selectedMonth.toLocaleDateString('tr-TR', {
        month: 'long',
        year: 'numeric'
    });
    
    // Format filter date for display
    const filterDateDisplay = filterDate 
        ? new Date(filterDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Date Filter Info */}
            {filterDateDisplay && (
                <View style={styles.filterInfo}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.clearFilterButton}>
                        <Text style={styles.clearFilterText}>← Geri</Text>
                    </TouchableOpacity>
                    <Text style={styles.filterText}>📅 {filterDateDisplay}</Text>
                </View>
            )}
            
            {/* Month Selector */}
            {!filterDate && (
                <View style={styles.monthSelector}>
                    <TouchableOpacity onPress={previousMonth} style={styles.monthButton}>
                        <Text style={styles.monthButtonText}>◀</Text>
                    </TouchableOpacity>
                    <Text style={styles.monthText}>{monthName}</Text>
                    <TouchableOpacity
                        onPress={nextMonth}
                        style={styles.monthButton}
                    disabled={new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1) > new Date()}
                >
                    <Text style={styles.monthButtonText}>▶</Text>
                </TouchableOpacity>
            </View>
            )}

            {/* Total */}
            <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Toplam Harcama</Text>
                <Text style={styles.totalAmount}>₺{totalAmount.toFixed(2)}</Text>
            </View>

            {/* Expense List */}
            <ScrollView style={styles.list}>
                {expenses.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>Bu ay henüz harcama yok</Text>
                    </View>
                ) : (
                    expenses.map((expense) => (
                        <View key={expense.id} style={styles.expenseCard}>
                            <View style={styles.expenseHeader}>
                                <View style={styles.expenseCategory}>
                                    <Text style={styles.categoryIcon}>
                                        {CategoryIcons[expense.category]}
                                    </Text>
                                    <View style={styles.expenseInfo}>
                                        <Text style={styles.categoryName}>
                                            {CategoryNames[expense.category]}
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
                                </View>
                                <Text style={styles.expenseAmount}>₺{expense.amount.toFixed(2)}</Text>
                            </View>
                            {expense.note && (
                                <Text style={styles.expenseNote}>{expense.note}</Text>
                            )}
                            {expense.photoURL && (
                                <TouchableOpacity onPress={() => setSelectedImage(expense.photoURL!)}>
                                    <Image
                                        source={{ uri: expense.photoURL }}
                                        style={styles.expenseImage}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>

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

            {/* Add Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/expenses/add')}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
        </View>
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
        color: '#007AFF',
    },
    monthText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    totalCard: {
        margin: 20,
        padding: 20,
        backgroundColor: '#007AFF',
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
    expenseCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    expenseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    expenseCategory: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    expenseInfo: {
        flex: 1,
    },
    categoryIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    expenseDate: {
        fontSize: 12,
        color: '#999',
    },
    expenseAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FF3B30',
    },
    expenseNote: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    expenseImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginTop: 12,
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
    filterInfo: {
        backgroundColor: '#E3F2FD',
        padding: 16,
        paddingTop: 60,
        marginBottom: 12,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    filterText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1976D2',
        flex: 1,
        textAlign: 'center',
    },
    clearFilterButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#fff',
        borderRadius: 8,
    },
    clearFilterText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1976D2',
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    expenseDate: {
        fontSize: 12,
        color: '#999',
    },
    expenseAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FF3B30',
    },
    expenseNote: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    expenseImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginTop: 12,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    fabText: {
        fontSize: 32,
        color: '#fff',
        fontWeight: '300',
    },
});
