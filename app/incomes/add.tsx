import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Switch,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { incomeService } from '../../services/incomeService';
import { useRouter } from 'expo-router';

export default function AddIncomeScreen() {
    const { user } = useAuth();
    const router = useRouter();

    const [amount, setAmount] = useState('');
    const [source, setSource] = useState('');
    const [note, setNote] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Önceden tanımlı gelir kaynakları
    const predefinedSources = [
        { emoji: '💼', name: 'Maaş' },
        { emoji: '💰', name: 'Harçlık' },
        { emoji: '💻', name: 'Freelance' },
        { emoji: '🎁', name: 'Hediye' },
        { emoji: '📈', name: 'Yatırım' },
        { emoji: '🏪', name: 'İşletme' },
    ];

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

        if (!source.trim()) {
            Alert.alert('Eksik Bilgi', 'Lütfen gelir kaynağını girin');
            return;
        }

        setLoading(true);
        try {
            await incomeService.addIncome(
                user.uid,
                amountNum,
                source.trim(),
                new Date(),
                isRecurring,
                note.trim()
            );

            // Formu temizle
            setAmount('');
            setSource('');
            setNote('');
            setIsRecurring(false);

            Alert.alert('Başarılı! 🎉', 'Gelir başarıyla eklendi', [
                {
                    text: 'Tamam',
                    onPress: () => router.back(),
                    style: 'default'
                }
            ]);
        } catch (error: any) {
            console.error('Save error:', error);
            Alert.alert('Hata', error.message || 'Gelir eklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = () => {
        const amountNum = parseFloat(amount.replace(',', '.'));
        return amount && !isNaN(amountNum) && amountNum > 0 && source.trim();
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
                        <Text style={styles.headerIcon}>💵</Text>
                        <Text style={styles.title}>Yeni Gelir</Text>
                        <Text style={styles.subtitle}>Gelir bilgilerini girin</Text>
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

                    {/* Quick Source Selection */}
                    <View style={styles.section}>
                        <Text style={styles.label}>🏷️ Hızlı Seçim</Text>
                        <View style={styles.quickSourcesContainer}>
                            {predefinedSources.map((item) => (
                                <TouchableOpacity
                                    key={item.name}
                                    style={[
                                        styles.quickSourceButton,
                                        source === item.name && styles.quickSourceButtonSelected
                                    ]}
                                    onPress={() => setSource(item.name)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.quickSourceEmoji}>{item.emoji}</Text>
                                    <Text style={[
                                        styles.quickSourceText,
                                        source === item.name && styles.quickSourceTextSelected
                                    ]}>
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Source Input */}
                    <View style={styles.section}>
                        <Text style={styles.label}>📝 Gelir Kaynağı</Text>
                        <View style={[
                            styles.inputWrapper,
                            focusedField === 'source' && styles.inputWrapperFocused
                        ]}>
                            <Text style={styles.inputIcon}>💼</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Örn: Maaş, Harçlık, Freelance..."
                                placeholderTextColor="#999"
                                value={source}
                                onChangeText={setSource}
                                maxLength={50}
                                onFocus={() => setFocusedField('source')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>
                    </View>

                    {/* Recurring Toggle */}
                    <View style={styles.section}>
                        <Text style={styles.label}>🔄 Düzenli Gelir Ayarı</Text>
                        <View style={styles.switchCard}>
                            <View style={styles.switchContent}>
                                <View style={styles.switchIconContainer}>
                                    <Text style={styles.switchIcon}>🔁</Text>
                                </View>
                                <View style={styles.switchLabel}>
                                    <Text style={styles.switchTitle}>Düzenli Gelir</Text>
                                    <Text style={styles.switchSubtext}>
                                        Her ay otomatik tekrar eden gelir (maaş, harçlık vb.)
                                    </Text>
                                </View>
                                <Switch
                                    value={isRecurring}
                                    onValueChange={setIsRecurring}
                                    trackColor={{ false: '#E0E0E0', true: '#34C759' }}
                                    thumbColor={'#fff'}
                                    ios_backgroundColor="#E0E0E0"
                                />
                            </View>
                            {isRecurring && (
                                <View style={styles.recurringInfoBox}>
                                    <Text style={styles.recurringInfoIcon}>ℹ️</Text>
                                    <Text style={styles.recurringInfoText}>
                                        Bu gelir her ay otomatik olarak bütçenize eklenecek
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Note */}
                    <View style={styles.section}>
                        <Text style={styles.label}>📋 Not (Opsiyonel)</Text>
                        <View style={[
                            styles.noteInputWrapper,
                            focusedField === 'note' && styles.noteInputWrapperFocused
                        ]}>
                            <TextInput
                                style={styles.noteInput}
                                placeholder="Gelir hakkında not ekleyin..."
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

                    {/* Summary Card */}
                    {isFormValid() && (
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>📊 Özet</Text>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Tutar:</Text>
                                <Text style={styles.summaryValue}>
                                    +₺{parseFloat(amount.replace(',', '.')).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Kaynak:</Text>
                                <Text style={styles.summaryValue}>{source}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Düzenli:</Text>
                                <Text style={styles.summaryValue}>{isRecurring ? '✓ Evet' : '✕ Hayır'}</Text>
                            </View>
                        </View>
                    )}

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
                                    <Text style={styles.saveButtonText}>Geliri Kaydet</Text>
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
        borderColor: '#34C759',
        shadowColor: '#34C759',
        shadowOpacity: 0.15,
    },
    currencySymbol: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#34C759',
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
    quickSourcesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    quickSourceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    quickSourceButtonSelected: {
        backgroundColor: '#E8F5E9',
        borderColor: '#34C759',
        shadowColor: '#34C759',
        shadowOpacity: 0.2,
    },
    quickSourceEmoji: {
        fontSize: 20,
    },
    quickSourceText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    quickSourceTextSelected: {
        color: '#2E7D32',
        fontWeight: '700',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    inputWrapperFocused: {
        borderColor: '#34C759',
        shadowColor: '#34C759',
        shadowOpacity: 0.15,
    },
    inputIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1A1A1A',
        paddingVertical: 16,
    },
    switchCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    switchContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    switchIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    switchIcon: {
        fontSize: 22,
    },
    switchLabel: {
        flex: 1,
        marginRight: 12,
    },
    switchTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    switchSubtext: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    recurringInfoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        padding: 12,
        borderRadius: 12,
        marginTop: 12,
        gap: 8,
    },
    recurringInfoIcon: {
        fontSize: 16,
    },
    recurringInfoText: {
        flex: 1,
        fontSize: 13,
        color: '#1565C0',
        fontWeight: '500',
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
        borderColor: '#34C759',
        shadowColor: '#34C759',
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
    summaryCard: {
        backgroundColor: '#E8F5E9',
        borderRadius: 16,
        padding: 20,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: '#81C784',
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2E7D32',
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 15,
        color: '#1B5E20',
        fontWeight: '700',
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