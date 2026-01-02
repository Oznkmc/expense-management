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
import { tagService } from '../../services/tagService';
import { Expense, CategoryNames, CategoryIcons, MainCategory, getMainCategory, MainCategoryNames, Tag } from '../../types';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ExpenseListScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams();
    const filterDate = params.date as string | undefined;
    const filterCategory = params.category as MainCategory | undefined;
    
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
    const [showTagFilterModal, setShowTagFilterModal] = useState(false);

    useEffect(() => {
        loadExpenses();
    }, [selectedMonth, selectedTagFilters]);

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

    const getExpenseTags = (expense: Expense): Tag[] => {
        if (!expense.tags || expense.tags.length === 0) return [];
        return allTags.filter(tag => expense.tags!.includes(tag.id));
    };

    const loadExpenses = async () => {
        if (!user) return;

        try {
            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth() + 1;
            const data = await expenseService.getMonthlyExpenses(user.uid, year, month);
            
            let filtered = data;
            
            // Filter by specific date if provided
            if (filterDate) {
                filtered = filtered.filter(exp => {
                    const expDate = `${exp.date.getFullYear()}-${(exp.date.getMonth() + 1)
                        .toString()
                        .padStart(2, '0')}-${exp.date.getDate().toString().padStart(2, '0')}`;
                    return expDate === filterDate;
                });
            }
            
            // Filter by category if provided
            if (filterCategory) {
                filtered = filtered.filter(exp => {
                    const mainCat = getMainCategory(exp.category);
                    return mainCat === filterCategory;
                });
            }
            
            // Filter by tags if selected
            if (selectedTagFilters.length > 0) {
                filtered = filtered.filter(exp => {
                    if (!exp.tags || exp.tags.length === 0) return false;
                    // Check if expense has ANY of the selected tags (OR logic)
                    return selectedTagFilters.some(tagId => exp.tags!.includes(tagId));
                });
            }
            
            setExpenses(filtered);
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
    
    // Format category for display
    const filterCategoryDisplay = filterCategory 
        ? MainCategoryNames[filterCategory]
        : null;

    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

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
            
            {/* Category Filter Info */}
            {filterCategoryDisplay && (
                <View style={styles.filterInfo}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.clearFilterButton}>
                        <Text style={styles.clearFilterText}>← Geri</Text>
                    </TouchableOpacity>
                    <Text style={styles.filterText}>📊 {filterCategoryDisplay}</Text>
                </View>
            )}
            
            {/* Back Button & Month Selector */}
            {!filterDate && !filterCategory && (
                <View>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Text style={styles.backButtonText}>← Geri</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Harcama Listesi</Text>
                        <View style={styles.headerSpacer} />
                    </View>
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
                            {getExpenseTags(expense).length > 0 && (
                                <View style={styles.tagsContainer}>
                                    {getExpenseTags(expense).map(tag => (
                                        <View key={tag.id} style={[styles.tagChip, { backgroundColor: tag.color }]}>
                                            {tag.icon && <Text style={styles.tagIcon}>{tag.icon}</Text>}
                                            <Text style={styles.tagText}>{tag.name}</Text>
                                        </View>
                                    ))}
                                </View>
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
    header: {
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
    headerTitle: {
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#fff',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    clearFilterText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1976D2',
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
        color: '#007AFF',
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
    tagFilterModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
        width: '100%',
        position: 'absolute',
        bottom: 0,
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
        borderColor: '#007AFF',
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
        color: '#007AFF',
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
        backgroundColor: '#007AFF',
        borderRadius: 12,
        alignItems: 'center',
    },
    tagFilterApplyButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
