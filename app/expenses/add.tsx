import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Animated
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { expenseService } from '../../services/expenseService';
import { ExpenseCategory, CategoryNames, CategoryIcons, getMainCategory, MainCategory } from '../../types';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

export default function AddExpenseScreen() {
    const { user } = useAuth();
    const router = useRouter();

    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
    const [note, setNote] = useState('');
    const [date, setDate] = useState(new Date());
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [expandedMainCategory, setExpandedMainCategory] = useState<MainCategory | null>(null);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const mainCategories: MainCategory[] = [
        MainCategory.FOOD,
        MainCategory.TRANSPORT,
        MainCategory.EDUCATION,
        MainCategory.ENTERTAINMENT,
        MainCategory.CLOTHING,
        MainCategory.COMMUNICATION,
        MainCategory.HEALTH,
        MainCategory.OTHER
    ];

    const mainCategoryNames = {
        [MainCategory.FOOD]: { icon: '🍽️', name: 'Yemek' },
        [MainCategory.TRANSPORT]: { icon: '🚌', name: 'Ulaşım' },
        [MainCategory.EDUCATION]: { icon: '📚', name: 'Eğitim' },
        [MainCategory.ENTERTAINMENT]: { icon: '🎮', name: 'Eğlence' },
        [MainCategory.CLOTHING]: { icon: '👕', name: 'Giyim' },
        [MainCategory.COMMUNICATION]: { icon: '📱', name: 'İletişim' },
        [MainCategory.HEALTH]: { icon: '🏥', name: 'Sağlık' },
        [MainCategory.OTHER]: { icon: '💰', name: 'Diğer' }
    };

    const getCategoriesByMain = (mainCat: MainCategory): ExpenseCategory[] => {
        return Object.values(ExpenseCategory).filter(cat => getMainCategory(cat) === mainCat);
    };

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Galeri erişim izni gerekli');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setImageUri(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Hata', 'Görsel seçilirken bir hata oluştu');
        }
    };

    const takePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Kamera erişim izni gerekli');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setImageUri(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu');
        }
    };

    const handleAmountChange = (text: string) => {
        const cleaned = text.replace(/[^0-9.,]/g, '');
        setAmount(cleaned);
    };

    const handleSave = async () => {
        if (!user) {
            Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı');
            return;
        }

        const amountNum = parseFloat(amount.replace(',', '.'));
        if (isNaN(amountNum) || amountNum <= 0) {
            Alert.alert('Geçersiz Tutar', 'Lütfen geçerli bir tutar girin');
            return;
        }

        if (!selectedCategory) {
            Alert.alert('Kategori Seçilmedi', 'Lütfen bir kategori seçin');
            return;
        }

        setLoading(true);
        try {
            await expenseService.addExpense(
                user.uid,
                amountNum,
                selectedCategory,
                date,
                note.trim(),
                imageUri || undefined
            );

            // Formu temizle
            setAmount('');
            setSelectedCategory(null);
            setNote('');
            setImageUri(null);
            setExpandedMainCategory(null);

            Alert.alert('Başarılı! 🎉', 'Harcama başarıyla eklendi', [
                {
                    text: 'Tamam',
                    onPress: () => router.back(),
                    style: 'default'
                }
            ]);
        } catch (error: any) {
            console.error('Save error:', error);
            Alert.alert('Hata', error.message || 'Harcama eklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = () => {
        const amountNum = parseFloat(amount.replace(',', '.'));
        return amount && !isNaN(amountNum) && amountNum > 0 && selectedCategory;
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerIcon}>💸</Text>
                        <Text style={styles.title}>Yeni Harcama</Text>
                        <Text style={styles.subtitle}>Harcama bilgilerini girin</Text>
                    </View>

                    {/* Amount Input */}
                    <View style={styles.section}>
                        <Text style={styles.label}>💰 Tutar</Text>
                        <View style={[
                            styles.amountInputWrapper,
                            focusedField === 'amount' && styles.amountInputWrapperFocused
                        ]}>
                            <Text style={styles.currencySymbol}>₺</Text>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0.00"
                                placeholderTextColor="#999"
                                value={amount}
                                onChangeText={handleAmountChange}
                                keyboardType="decimal-pad"
                                maxLength={10}
                                onFocus={() => setFocusedField('amount')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>
                    </View>

                    {/* Selected Category Display */}
                    {selectedCategory && (
                        <View style={styles.selectedCategoryBox}>
                            <View style={styles.selectedCategoryHeader}>
                                <Text style={styles.selectedLabel}>✓ Seçili Kategori</Text>
                                <TouchableOpacity
                                    onPress={() => setSelectedCategory(null)}
                                    style={styles.clearCategoryButton}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.clearCategoryText}>Değiştir</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.selectedCategoryContent}>
                                <View style={styles.selectedCategoryIconContainer}>
                                    <Text style={styles.selectedCategoryIcon}>
                                        {CategoryIcons[selectedCategory]}
                                    </Text>
                                </View>
                                <Text style={styles.selectedCategoryName}>
                                    {CategoryNames[selectedCategory]}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Category Selection */}
                    <View style={styles.section}>
                        <Text style={styles.label}>🏷️ Kategori Seçin</Text>
                        <View style={styles.categoryContainer}>
                            {mainCategories.map(mainCat => {
                                const { icon, name } = mainCategoryNames[mainCat];
                                const subCategories = getCategoriesByMain(mainCat);
                                const isExpanded = expandedMainCategory === mainCat;

                                return (
                                    <View key={mainCat} style={styles.categoryGroup}>
                                        <TouchableOpacity
                                            style={[
                                                styles.mainCategoryButton,
                                                isExpanded && styles.mainCategoryButtonExpanded
                                            ]}
                                            onPress={() => setExpandedMainCategory(isExpanded ? null : mainCat)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.mainCategoryLeft}>
                                                <Text style={styles.mainCategoryIcon}>{icon}</Text>
                                                <Text style={styles.mainCategoryText}>{name}</Text>
                                            </View>
                                            <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                                        </TouchableOpacity>

                                        {isExpanded && (
                                            <View style={styles.subCategories}>
                                                {subCategories.map(cat => (
                                                    <TouchableOpacity
                                                        key={cat}
                                                        style={[
                                                            styles.categoryButton,
                                                            selectedCategory === cat && styles.categoryButtonSelected
                                                        ]}
                                                        onPress={() => {
                                                            setSelectedCategory(cat);
                                                            setExpandedMainCategory(null);
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={styles.categoryButtonContent}>
                                                            <Text style={styles.categoryIcon}>{CategoryIcons[cat]}</Text>
                                                            <Text style={[
                                                                styles.categoryText,
                                                                selectedCategory === cat && styles.categoryTextSelected
                                                            ]}>
                                                                {CategoryNames[cat]}
                                                            </Text>
                                                        </View>
                                                        {selectedCategory === cat && (
                                                            <Text style={styles.checkmark}>✓</Text>
                                                        )}
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Note */}
                    <View style={styles.section}>
                        <Text style={styles.label}>📝 Not (Opsiyonel)</Text>
                        <View style={[
                            styles.noteInputWrapper,
                            focusedField === 'note' && styles.noteInputWrapperFocused
                        ]}>
                            <TextInput
                                style={styles.noteInput}
                                placeholder="Harcama hakkında not ekleyin..."
                                placeholderTextColor="#999"
                                value={note}
                                onChangeText={setNote}
                                multiline
                                maxLength={200}
                                textAlignVertical="top"
                                onFocus={() => setFocusedField('note')}
                                onBlur={() => setFocusedField(null)}
                            />
                            <Text style={styles.characterCount}>{note.length}/200</Text>
                        </View>
                    </View>

                    {/* Photo */}
                    <View style={styles.section}>
                        <Text style={styles.label}>📷 Fiş/Fatura Fotoğrafı (Opsiyonel)</Text>
                        {imageUri ? (
                            <View style={styles.imagePreview}>
                                <Image source={{ uri: imageUri }} style={styles.image} />
                                <View style={styles.imageOverlay}>
                                    <TouchableOpacity
                                        style={styles.changeImageButton}
                                        onPress={pickImage}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.imageButtonText}>🖼️ Değiştir</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.removeImageButton}
                                        onPress={() => setImageUri(null)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.imageButtonText}>🗑️ Kaldır</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.photoButtons}>
                                <TouchableOpacity
                                    style={styles.photoButton}
                                    onPress={takePhoto}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.photoButtonIcon}>📸</Text>
                                    <Text style={styles.photoButtonText}>Fotoğraf Çek</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.photoButton}
                                    onPress={pickImage}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.photoButtonIcon}>🖼️</Text>
                                    <Text style={styles.photoButtonText}>Galeriden Seç</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                (!isFormValid() || loading) && styles.saveButtonDisabled
                            ]}
                            onPress={handleSave}
                            disabled={!isFormValid() || loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <Text style={styles.loadingIcon}>⏳</Text>
                                    <Text style={styles.saveButtonText}>Kaydediliyor...</Text>
                                </View>
                            ) : (
                                <>
                                    <Text style={styles.saveButtonIcon}>✅</Text>
                                    <Text style={styles.saveButtonText}>Harcamayı Kaydet</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => router.back()}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelButtonText}>İptal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    headerIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
        fontWeight: '500',
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    amountInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    amountInputWrapperFocused: {
        borderColor: '#007AFF',
        shadowColor: '#007AFF',
        shadowOpacity: 0.15,
    },
    currencySymbol: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#007AFF',
        marginRight: 8,
    },
    amountInput: {
        flex: 1,
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1A1A1A',
        textAlign: 'center',
        paddingVertical: 16,
    },
    categoryContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    categoryGroup: {
        marginBottom: 4,
    },
    mainCategoryButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        padding: 16,
        borderRadius: 12,
        marginBottom: 4,
    },
    mainCategoryButtonExpanded: {
        backgroundColor: '#E3F2FD',
    },
    mainCategoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    mainCategoryIcon: {
        fontSize: 20,
    },
    mainCategoryText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    expandIcon: {
        fontSize: 12,
        color: '#666',
    },
    subCategories: {
        paddingLeft: 12,
        paddingTop: 4,
        paddingBottom: 8,
    },
    categoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8F9FA',
        padding: 14,
        borderRadius: 10,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    categoryButtonSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    categoryButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryIcon: {
        fontSize: 22,
        marginRight: 12,
    },
    categoryText: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    categoryTextSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    checkmark: {
        fontSize: 18,
        color: '#fff',
        fontWeight: 'bold',
    },
    noteInputWrapper: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    noteInputWrapperFocused: {
        borderColor: '#007AFF',
        shadowColor: '#007AFF',
        shadowOpacity: 0.15,
    },
    noteInput: {
        fontSize: 16,
        color: '#1A1A1A',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    characterCount: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginTop: 8,
    },
    photoButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    photoButton: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
    },
    photoButtonIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    photoButtonText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
    },
    imagePreview: {
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
    image: {
        width: '100%',
        height: 250,
        backgroundColor: '#F0F0F0',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: 8,
        padding: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    changeImageButton: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    removeImageButton: {
        flex: 1,
        backgroundColor: 'rgba(255, 59, 48, 0.9)',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    imageButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },
    selectedCategoryBox: {
        backgroundColor: '#E8F5E9',
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: '#4CAF50',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    selectedCategoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    selectedLabel: {
        fontSize: 13,
        color: '#2E7D32',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    clearCategoryButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    clearCategoryText: {
        fontSize: 12,
        color: '#2E7D32',
        fontWeight: '600',
    },
    selectedCategoryContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectedCategoryIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    selectedCategoryIcon: {
        fontSize: 28,
    },
    selectedCategoryName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1B5E20',
        flex: 1,
    },
    actionButtons: {
        marginTop: 8,
        gap: 12,
    },
    saveButton: {
        flexDirection: 'row',
        backgroundColor: '#34C759',
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#34C759',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 5,
    },
    saveButtonDisabled: {
        backgroundColor: '#B0B0B0',
        shadowOpacity: 0,
        elevation: 0,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    loadingIcon: {
        fontSize: 18,
    },
    saveButtonIcon: {
        fontSize: 18,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    cancelButton: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E0E0E0',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
});