import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    Modal
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { incomeService } from '../../services/incomeService';
import { tagService } from '../../services/tagService';
import { Income, Tag } from '../../types';
import { useRouter } from 'expo-router';

export default function IncomeListScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
    const [showTagFilterModal, setShowTagFilterModal] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            loadIncomes();
        }, [selectedMonth, selectedTagFilters])
    );

    useEffect(() => {
        if (user) {
            loadTags();
        }
    }, [user]);

    const loadTags = async () => {
        if (!user) return;
        try {
            const tags = await tagService.getTags(user.uid);
            setAllTags(tags);
        } catch (error) {
            console.error('Tags load error:', error);
        }
    };

    const getIncomeTags = (income: Income): Tag[] => {
        if (!income.tags || income.tags.length === 0) return [];
        return allTags.filter(tag => income.tags!.includes(tag.id));
    };

    const loadIncomes = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth() + 1;
            const data = await incomeService.getMonthlyIncomes(user.uid, year, month);
            
            let filtered = data;
            
            // Filter by tags if selected
            if (selectedTagFilters.length > 0) {
                filtered = filtered.filter(income => {
                    if (!income.tags || income.tags.length === 0) return false;
                    // Check if income has ANY of the selected tags (OR logic)
                    return selectedTagFilters.some(tagId => income.tags!.includes(tagId));
                });
            }
            
            setIncomes(filtered);
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

    const toggleTagFilter = (tagId: string) => {
        setSelectedTagFilters(prev => 
            prev.includes(tagId) 
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const clearTagFilters = () => {
        setSelectedTagFilters([]);
        setShowTagFilterModal(false);
    };

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

            {/* Tag Filter Button */}
            {allTags.length > 0 && (
                <View style={styles.tagFilterSection}>
                    <TouchableOpacity 
                        style={styles.tagFilterButton}
                        onPress={() => setShowTagFilterModal(true)}
                    >
                        <Text style={styles.tagFilterButtonText}>
                            🏷️ Etiket Filtresi
                            {selectedTagFilters.length > 0 && ` (${selectedTagFilters.length})`}
                        </Text>
                    </TouchableOpacity>
                    {selectedTagFilters.length > 0 && (
                        <TouchableOpacity 
                            style={styles.clearTagButton}
                            onPress={clearTagFilters}
                        >
                            <Text style={styles.clearTagButtonText}>✕ Temizle</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
            
            {/* Active Tag Filters Display */}
            {selectedTagFilters.length > 0 && (
                <View style={styles.activeFiltersContainer}>
                    <Text style={styles.activeFiltersLabel}>Aktif Filtreler:</Text>
                    <View style={styles.activeFilterChips}>
                        {allTags
                            .filter(tag => selectedTagFilters.includes(tag.id))
                            .map(tag => (
                                <View key={tag.id} style={[styles.activeFilterChip, { backgroundColor: tag.color }]}>
                                    {tag.icon && <Text style={styles.activeFilterIcon}>{tag.icon}</Text>}
                                    <Text style={styles.activeFilterText}>{tag.name}</Text>
                                </View>
                            ))}
                    </View>
                </View>
            )}

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
                            
                            {getIncomeTags(income).length > 0 && (
                                <View style={styles.tagsContainer}>
                                    {getIncomeTags(income).map(tag => (
                                        <View key={tag.id} style={[styles.tagChip, { backgroundColor: tag.color }]}>
                                            {tag.icon && <Text style={styles.tagIcon}>{tag.icon}</Text>}
                                            <Text style={styles.tagText}>{tag.name}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))
                )}
                <View style={{ height: 80 }} /> 
            </ScrollView>

            {/* Tag Filter Modal */}
            <Modal
                visible={showTagFilterModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTagFilterModal(false)}
            >
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        style={styles.modalBackground}
                        activeOpacity={1}
                        onPress={() => setShowTagFilterModal(false)}
                    >
                        <View style={styles.tagFilterModalContent}>
                            <View style={styles.tagFilterHeader}>
                                <Text style={styles.tagFilterTitle}>Etiket Filtresi</Text>
                                <TouchableOpacity onPress={() => setShowTagFilterModal(false)}>
                                    <Text style={styles.tagFilterCloseButton}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            
                            <ScrollView style={styles.tagFilterList}>
                                {allTags.length === 0 ? (
                                    <Text style={styles.noTagsText}>Henüz etiket oluşturulmamış</Text>
                                ) : (
                                    allTags.map(tag => (
                                        <TouchableOpacity
                                            key={tag.id}
                                            style={[
                                                styles.tagFilterOption,
                                                selectedTagFilters.includes(tag.id) && styles.tagFilterOptionSelected
                                            ]}
                                            onPress={() => toggleTagFilter(tag.id)}
                                        >
                                            <View style={styles.tagFilterOptionLeft}>
                                                <View style={[styles.tagFilterColorBox, { backgroundColor: tag.color }]}>
                                                    {tag.icon && <Text style={styles.tagFilterIcon}>{tag.icon}</Text>}
                                                </View>
                                                <Text style={styles.tagFilterName}>{tag.name}</Text>
                                            </View>
                                            {selectedTagFilters.includes(tag.id) && (
                                                <Text style={styles.tagFilterCheckmark}>✓</Text>
                                            )}
                                        </TouchableOpacity>
                                    ))
                                )}
                            </ScrollView>
                            
                            <View style={styles.tagFilterFooter}>
                                <TouchableOpacity
                                    style={styles.tagFilterClearButton}
                                    onPress={clearTagFilters}
                                >
                                    <Text style={styles.tagFilterClearButtonText}>Temizle</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.tagFilterApplyButton}
                                    onPress={() => setShowTagFilterModal(false)}
                                >
                                    <Text style={styles.tagFilterApplyButtonText}>Uygula</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            </Modal>

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
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    tagIcon: {
        fontSize: 12,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#fff',
    },
    tagFilterSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
    },
    tagFilterButton: {
        flex: 1,
        backgroundColor: '#fff',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tagFilterButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#34C759',
        textAlign: 'center',
    },
    clearTagButton: {
        backgroundColor: '#FF3B30',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    clearTagButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    activeFiltersContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    activeFiltersLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    activeFilterChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    activeFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 4,
    },
    activeFilterIcon: {
        fontSize: 13,
    },
    activeFilterText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    tagFilterModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
        width: '100%',
    },
    tagFilterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tagFilterTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
    },
    tagFilterCloseButton: {
        fontSize: 28,
        color: '#666',
        fontWeight: '300',
    },
    tagFilterList: {
        maxHeight: 400,
        padding: 16,
    },
    noTagsText: {
        fontSize: 15,
        color: '#999',
        textAlign: 'center',
        paddingVertical: 20,
    },
    tagFilterOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    tagFilterOptionSelected: {
        backgroundColor: '#E3F2FD',
        borderColor: '#34C759',
    },
    tagFilterOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    tagFilterColorBox: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tagFilterIcon: {
        fontSize: 18,
    },
    tagFilterName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    tagFilterCheckmark: {
        fontSize: 24,
        color: '#34C759',
        fontWeight: '700',
    },
    tagFilterFooter: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    tagFilterClearButton: {
        flex: 1,
        padding: 14,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        alignItems: 'center',
    },
    tagFilterClearButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    tagFilterApplyButton: {
        flex: 2,
        padding: 14,
        backgroundColor: '#34C759',
        borderRadius: 12,
        alignItems: 'center',
    },
    tagFilterApplyButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
