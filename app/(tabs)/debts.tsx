import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Keyboard,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { debtService } from '../../services/debtService';
import { DebtNote, DebtDirection, DebtStatus, DebtDirectionLabels } from '../../types';

export default function DebtsScreen() {
  const { user } = useAuth();

  const [debts, setDebts] = useState<DebtNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [direction, setDirection] = useState<DebtDirection>(DebtDirection.OWING);
  const [dueDateInput, setDueDateInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Memoized calculations
  const { totalOwing, totalOwed, netBalance } = useMemo(() => {
    const owing = debts
      .filter(d => d.direction === DebtDirection.OWING && d.status === DebtStatus.OPEN)
      .reduce((sum, d) => sum + d.amount, 0);

    const owed = debts
      .filter(d => d.direction === DebtDirection.OWED && d.status === DebtStatus.OPEN)
      .reduce((sum, d) => sum + d.amount, 0);

    return {
      totalOwing: owing,
      totalOwed: owed,
      netBalance: owed - owing
    };
  }, [debts]);

  // Grouped and sorted debts
  const groupedDebts = useMemo(() => {
    const open = debts.filter(d => d.status === DebtStatus.OPEN);
    const paid = debts.filter(d => d.status === DebtStatus.PAID);

    return {
      open: open.sort((a, b) => {
        // Sort by due date first (if exists), then by amount
        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.amount - a.amount;
      }),
      paid: paid.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    };
  }, [debts]);

  useFocusEffect(
    useCallback(() => {
      loadDebts();
    }, [user])
  );

  const loadDebts = async () => {
    if (!user) return;

    try {
      const data = await debtService.getDebts(user.uid);
      setDebts(data);
    } catch (error) {
      console.error('Debts load error:', error);
      Alert.alert('Hata', 'Borç/alacak notları yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setCounterparty('');
    setAmount('');
    setNote('');
    setDueDateInput('');
    setDirection(DebtDirection.OWING);
    Keyboard.dismiss();
  };

  const validateForm = (): { isValid: boolean; error?: string } => {
    if (!counterparty.trim()) {
      return { isValid: false, error: 'Kişi bilgisini girin' };
    }

    const amountNum = parseFloat(amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      return { isValid: false, error: 'Geçerli bir tutar girin' };
    }

    if (dueDateInput.trim()) {
      const parsed = new Date(dueDateInput);
      if (isNaN(parsed.getTime())) {
        return { isValid: false, error: 'Tarihi YYYY-MM-DD formatında girin' };
      }
    }

    return { isValid: true };
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Hata', 'Oturum bulunamadı');
      return;
    }

    const validation = validateForm();
    if (!validation.isValid) {
      Alert.alert('Eksik Bilgi', validation.error || 'Lütfen tüm alanları doldurun');
      return;
    }

    const amountNum = parseFloat(amount.replace(',', '.'));
    const parsedDueDate = dueDateInput.trim() ? new Date(dueDateInput) : undefined;

    setSaving(true);
    try {
      await debtService.addDebt(
        user.uid,
        counterparty.trim(),
        amountNum,
        direction,
        note.trim(),
        parsedDueDate
      );

      resetForm();
      await loadDebts();
      Alert.alert('✅ Başarılı', 'Not başarıyla eklendi');
    } catch (error: any) {
      console.error('Debt save error:', error);
      Alert.alert('❌ Hata', error.message || 'Not eklenemedi');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (debt: DebtNote) => {
    const nextStatus = debt.status === DebtStatus.OPEN ? DebtStatus.PAID : DebtStatus.OPEN;
    const statusText = nextStatus === DebtStatus.PAID ? 'kapatılsın' : 'yeniden açılsın';

    Alert.alert(
      'Durum Değiştir',
      `Bu not ${statusText} mı?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          onPress: async () => {
            try {
              await debtService.updateDebt(debt.id, { status: nextStatus });
              setDebts(prev => prev.map(item =>
                item.id === debt.id ? { ...item, status: nextStatus } : item
              ));
            } catch (error) {
              Alert.alert('Hata', 'Durum güncellenemedi');
            }
          }
        }
      ]
    );
  };

  const handleDelete = (debt: DebtNote) => {
    Alert.alert(
      '🗑️ Not Sil',
      `${debt.counterparty} ile olan ${debt.amount.toFixed(2)} ₺ tutarındaki notu silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await debtService.deleteDebt(debt.id);
              setDebts(prev => prev.filter(d => d.id !== debt.id));
            } catch (error) {
              Alert.alert('Hata', 'Not silinemedi');
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const isOverdue = (dueDate: Date): boolean => {
    return dueDate < new Date();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadDebts();
            }}
            tintColor="#6366F1"
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🤝 Borç / Alacak</Text>
          <Text style={styles.subtitle}>Finansal ilişkilerini takip et</Text>
        </View>

        {/* Enhanced Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>💸 Toplam Borcum</Text>
              <Text style={styles.summaryValueOwing}>₺{formatCurrency(totalOwing)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>💰 Toplam Alacağım</Text>
              <Text style={styles.summaryValueOwed}>₺{formatCurrency(totalOwed)}</Text>
            </View>
          </View>

          <View style={styles.netBalanceContainer}>
            <Text style={styles.netBalanceLabel}>Net Durum:</Text>
            <Text style={[
              styles.netBalanceValue,
              netBalance > 0 ? styles.netPositive : netBalance < 0 ? styles.netNegative : styles.netNeutral
            ]}>
              {netBalance > 0 ? '+' : ''}{formatCurrency(Math.abs(netBalance))} ₺
            </Text>
          </View>
        </View>

        {/* Add Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>➕ Yeni Not Ekle</Text>
          <Text style={styles.cardHint}>Borç veya alacağını hızlıca kaydet</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>👤 Kişi</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Ahmet, Ayşe, Mehmet..."
              value={counterparty}
              onChangeText={setCounterparty}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>💵 Tutar</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>₺</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                placeholder="0,00"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={text => setAmount(text.replace(/[^0-9.,]/g, ''))}
                maxLength={10}
                returnKeyType="done"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>📊 Tip</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  direction === DebtDirection.OWING && styles.toggleButtonActiveOwing
                ]}
                onPress={() => setDirection(DebtDirection.OWING)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.toggleText,
                  direction === DebtDirection.OWING && styles.toggleTextActiveOwing
                ]}>
                  📤 {DebtDirectionLabels[DebtDirection.OWING]}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  direction === DebtDirection.OWED && styles.toggleButtonActiveOwed
                ]}
                onPress={() => setDirection(DebtDirection.OWED)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.toggleText,
                  direction === DebtDirection.OWED && styles.toggleTextActiveOwed
                ]}>
                  📥 {DebtDirectionLabels[DebtDirection.OWED]}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>📅 Son Tarih (opsiyonel)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (Örn: 2026-02-15)"
              value={dueDateInput}
              onChangeText={setDueDateInput}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>📝 Not (opsiyonel)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Detay ekle..."
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={resetForm}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Temizle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>
                {saving ? '⏳ Kaydediliyor...' : '✅ Kaydet'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Open Debts List */}
        {groupedDebts.open.length > 0 && (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>📋 Açık Notlar</Text>
              <Text style={styles.listCount}>{groupedDebts.open.length}</Text>
            </View>

            {groupedDebts.open.map(debt => (
              <DebtCard
                key={debt.id}
                debt={debt}
                onToggleStatus={toggleStatus}
                onDelete={handleDelete}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                isOverdue={isOverdue}
              />
            ))}
          </>
        )}

        {/* Paid Debts List */}
        {groupedDebts.paid.length > 0 && (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>✅ Kapatılanlar</Text>
              <Text style={styles.listCount}>{groupedDebts.paid.length}</Text>
            </View>

            {groupedDebts.paid.map(debt => (
              <DebtCard
                key={debt.id}
                debt={debt}
                onToggleStatus={toggleStatus}
                onDelete={handleDelete}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                isOverdue={isOverdue}
              />
            ))}
          </>
        )}

        {/* Empty State */}
        {debts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>Henüz kayıt yok</Text>
            <Text style={styles.emptyHint}>İlk notunu yukarıdaki formdan ekle</Text>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Separate DebtCard Component for better performance
const DebtCard = React.memo(({
  debt,
  onToggleStatus,
  onDelete,
  formatCurrency,
  formatDate,
  isOverdue
}: {
  debt: DebtNote;
  onToggleStatus: (debt: DebtNote) => void;
  onDelete: (debt: DebtNote) => void;
  formatCurrency: (value: number) => string;
  formatDate: (date: Date) => string;
  isOverdue: (date: Date) => boolean;
}) => {
  const isPaid = debt.status === DebtStatus.PAID;
  const isOwing = debt.direction === DebtDirection.OWING;
  const overdueStatus = debt.dueDate && !isPaid && isOverdue(debt.dueDate);

  return (
    <View style={[styles.debtCard, isPaid && styles.debtCardPaid]}>
      <View style={styles.debtHeader}>
        <View style={styles.debtTitleRow}>
          <Text style={styles.debtEmoji}>
            {isOwing ? '📤' : '📥'}
          </Text>
          <View style={styles.debtInfo}>
            <Text style={styles.debtPerson}>{debt.counterparty}</Text>
            <Text style={styles.debtMeta}>
              {DebtDirectionLabels[debt.direction]} • ₺{formatCurrency(debt.amount)}
            </Text>
          </View>
        </View>
        <Text style={[
          styles.statusBadge,
          isPaid && styles.statusPaid
        ]}>
          {isPaid ? '✓ Kapandı' : '○ Açık'}
        </Text>
      </View>

      {debt.dueDate && (
        <View style={styles.dueDateContainer}>
          <Text style={[
            styles.dueDate,
            overdueStatus && styles.dueDateOverdue
          ]}>
            {overdueStatus ? '⚠️ ' : '📅 '}
            Son tarih: {formatDate(debt.dueDate)}
            {overdueStatus && ' (Geçti!)'}
          </Text>
        </View>
      )}

      {debt.note && (
        <View style={styles.noteContainer}>
          <Text style={styles.debtNote}>💬 {debt.note}</Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => onToggleStatus(debt)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionText}>
            {isPaid ? '↩️ Yeniden Aç' : '✓ Kapat'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => onDelete(debt)}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteText}>🗑️ Sil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  scrollView: {
    flex: 1
  },
  contentContainer: {
    paddingTop: 60,
    paddingBottom: 40
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500'
  },
  summaryCard: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summaryItem: {
    flex: 1
  },
  summaryDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8
  },
  summaryValueOwing: {
    fontSize: 24,
    fontWeight: '800',
    color: '#EF4444'
  },
  summaryValueOwed: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10B981'
  },
  netBalanceContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  netBalanceLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600'
  },
  netBalanceValue: {
    fontSize: 20,
    fontWeight: '800'
  },
  netPositive: {
    color: '#10B981'
  },
  netNegative: {
    color: '#EF4444'
  },
  netNeutral: {
    color: '#6B7280'
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827'
  },
  cardHint: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827'
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  currency: {
    fontSize: 20,
    marginRight: 8,
    color: '#6B7280',
    fontWeight: '600'
  },
  amountInput: {
    flex: 1
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB'
  },
  toggleButtonActiveOwing: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171'
  },
  toggleButtonActiveOwed: {
    backgroundColor: '#ECFDF3',
    borderColor: '#34D399'
  },
  toggleText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '700'
  },
  toggleTextActiveOwing: {
    color: '#DC2626'
  },
  toggleTextActiveOwed: {
    color: '#059669'
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB'
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '700'
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  saveButtonDisabled: {
    opacity: 0.6
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800'
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 8
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827'
  },
  listCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  emptyState: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4
  },
  emptyHint: {
    fontSize: 14,
    color: '#6B7280'
  },
  debtCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12
  },
  debtCardPaid: {
    opacity: 0.7,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  debtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  debtTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  debtEmoji: {
    fontSize: 28
  },
  debtInfo: {
    flex: 1
  },
  debtPerson: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2
  },
  debtMeta: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600'
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontWeight: '800',
    fontSize: 12
  },
  statusPaid: {
    backgroundColor: '#D1FAE5',
    color: '#065F46'
  },
  dueDateContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6'
  },
  dueDate: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600'
  },
  dueDateOverdue: {
    color: '#DC2626',
    fontWeight: '700'
  },
  noteContainer: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10
  },
  debtNote: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14
  },
  actionButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5
  },
  primaryButton: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE'
  },
  actionText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 14
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA'
  },
  deleteText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 14
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600'
  },
  bottomSpacing: {
    height: 80
  }
});