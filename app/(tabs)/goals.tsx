import React, { useCallback, useMemo, useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Animated
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { goalService } from '../../services/goalService';
import { SavingGoal, GoalStatus } from '../../types';

export default function GoalsScreen() {
  const { user } = useAuth();

  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [dueDateInput, setDueDateInput] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Progress inputs per goal
  const [progressInputs, setProgressInputs] = useState<Record<string, string>>({});
  const [updatingGoals, setUpdatingGoals] = useState<Set<string>>(new Set());
  const [showQuickAmounts, setShowQuickAmounts] = useState<Record<string, boolean>>({});

  // Quick amount presets
  const quickAmounts = [50, 100, 200, 500];

  const summary = useMemo(() => {
    const active = goals.filter(g => g.status === GoalStatus.ACTIVE);
    const totalTarget = active.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSaved = active.reduce((sum, g) => sum + g.currentAmount, 0);
    const percent = totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0;
    return { totalTarget, totalSaved, percent, activeCount: active.length };
  }, [goals]);

  const groupedGoals = useMemo(() => {
    const active = goals.filter(g => g.status === GoalStatus.ACTIVE);
    const completed = goals.filter(g => g.status === GoalStatus.COMPLETED);
    const cancelled = goals.filter(g => g.status === GoalStatus.CANCELLED);
    return { active, completed, cancelled };
  }, [goals]);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [user])
  );

  const loadGoals = async () => {
    if (!user) {
      console.log('User not authenticated');
      setLoading(false);
      return;
    }
    try {
      console.log('Loading goals for user:', user.uid);
      const data = await goalService.getGoals(user.uid);
      console.log('Goals loaded:', data.length);
      setGoals(data);
    } catch (error: any) {
      console.error('Goals load error:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      Alert.alert('Hata', `Hedefler yüklenemedi: ${error?.message || 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setTargetAmount('');
    setDueDateInput('');
    setNote('');
  };

  const validateForm = () => {
    if (!title.trim()) return 'Hedefi adlandırın';
    const amountNum = parseFloat(targetAmount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) return 'Geçerli bir hedef tutarı girin';
    if (dueDateInput.trim()) {
      const parsed = new Date(dueDateInput);
      if (isNaN(parsed.getTime())) return 'Tarihi YYYY-MM-DD formatında girin';
      if (parsed < new Date()) return 'Gelecek bir tarih seçin';
    }
    return null;
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Hata', 'Oturum bulunamadı');
      return;
    }

    const error = validateForm();
    if (error) {
      Alert.alert('Eksik Bilgi', error);
      return;
    }

    const amountNum = parseFloat(targetAmount.replace(',', '.'));
    const parsedDueDate = dueDateInput.trim() ? new Date(dueDateInput) : undefined;

    setSaving(true);
    try {
      await goalService.addGoal(user.uid, title.trim(), amountNum, parsedDueDate, note.trim());
      resetForm();
      await loadGoals();
      Alert.alert('✅ Kaydedildi', 'Hedef başarıyla eklendi');
    } catch (err: any) {
      console.error('Goal save error:', err);
      Alert.alert('❌ Hata', err.message || 'Hedef kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (goal: SavingGoal, next: GoalStatus) => {
    if (updatingGoals.has(goal.id)) return;

    setUpdatingGoals(prev => new Set(prev).add(goal.id));
    try {
      await goalService.updateGoal(goal.id, { status: next });
      setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: next } : g));

      const message = next === GoalStatus.COMPLETED
        ? '🎉 Tebrikler! Hedefi tamamladın'
        : next === GoalStatus.ACTIVE
          ? 'Hedef tekrar aktifleştirildi'
          : 'Hedef iptal edildi';
      Alert.alert('Başarılı', message);
    } catch (error) {
      console.error('Toggle status error:', error);
      Alert.alert('Hata', 'Durum güncellenemedi');
    } finally {
      setUpdatingGoals(prev => {
        const newSet = new Set(prev);
        newSet.delete(goal.id);
        return newSet;
      });
    }
  };

  const handleDelete = (goal: SavingGoal) => {
    Alert.alert(
      'Hedefi Sil',
      `"${goal.title}" hedefini kalıcı olarak silmek istediğinden emin misin?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await goalService.deleteGoal(goal.id);
              setGoals(prev => prev.filter(g => g.id !== goal.id));
              Alert.alert('✅ Silindi', 'Hedef başarıyla silindi');
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Hata', 'Hedef silinemedi');
            }
          }
        }
      ]
    );
  };

  const handleAddProgress = async (goal: SavingGoal) => {
    if (updatingGoals.has(goal.id)) return;

    const raw = progressInputs[goal.id] || '';
    const amountNum = parseFloat(raw.replace(',', '.'));

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Geçersiz Tutar', 'Lütfen pozitif bir tutar girin');
      return;
    }

    const updatedAmount = goal.currentAmount + amountNum;
    const reached = updatedAmount >= goal.targetAmount;

    setUpdatingGoals(prev => new Set(prev).add(goal.id));
    try {
      await goalService.updateGoal(goal.id, {
        currentAmount: updatedAmount,
        status: reached ? GoalStatus.COMPLETED : goal.status,
      });

      setGoals(prev => prev.map(g => g.id === goal.id ? {
        ...g,
        currentAmount: updatedAmount,
        status: reached ? GoalStatus.COMPLETED : g.status
      } : g));

      setProgressInputs(prev => ({ ...prev, [goal.id]: '' }));

      if (reached) {
        Alert.alert('🎉 Tebrikler!', `"${goal.title}" hedefinizi tamamladınız!`);
      }
    } catch (error) {
      console.error('Add progress error:', error);
      Alert.alert('Hata', 'İlerleme eklenemedi');
    } finally {
      setUpdatingGoals(prev => {
        const newSet = new Set(prev);
        newSet.delete(goal.id);
        return newSet;
      });
    }
  };

  const formatCurrency = (value: number) => value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const formatDate = (date: Date) => date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const calculateProgress = (goal: SavingGoal) => {
    return Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  };

  const getRemainingAmount = (goal: SavingGoal) => {
    return Math.max(0, goal.targetAmount - goal.currentAmount);
  };

  const getMotivationMessage = (progress: number) => {
    if (progress >= 100) return '🎉 Tamamlandı!';
    if (progress >= 90) return '🔥 Neredeyse bitti!';
    if (progress >= 75) return '💪 Çok yaklaştın!';
    if (progress >= 50) return '👍 Yarı yoldasın!';
    if (progress >= 25) return '🚀 İyi gidiyorsun!';
    return '💫 Başlangıç yaptın!';
  };

  const handleCancelGoal = (goal: SavingGoal) => {
    Alert.alert(
      'Hedefi İptal Et',
      `"${goal.title}" hedefini iptal etmek istediğinden emin misin? İlerlemeni kaybetmeyeceksin.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: () => toggleStatus(goal, GoalStatus.CANCELLED)
        }
      ]
    );
  };

  const handleQuickAmountAdd = async (goal: SavingGoal, amount: number) => {
    setProgressInputs(prev => ({ ...prev, [goal.id]: amount.toString() }));
    // Auto-add after setting
    setTimeout(() => handleAddProgress(goal), 100);
  };

  const toggleQuickAmounts = (goalId: string) => {
    setShowQuickAmounts(prev => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadGoals();
            }}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>🎯 Hedefler</Text>
          <Text style={styles.subtitle}>Hayallerini gerçeğe dönüştür</Text>
        </View>

        {summary.activeCount > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Toplam Hedef</Text>
                <Text style={styles.summaryValue}>₺{formatCurrency(summary.totalTarget)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Biriken</Text>
                <Text style={[styles.summaryValue, styles.positive]}>₺{formatCurrency(summary.totalSaved)}</Text>
              </View>
            </View>
            <View style={styles.progressBarOuter}>
              <View style={[styles.progressBarInner, { width: `${summary.percent}%` }]} />
            </View>
            <Text style={styles.progressText}>
              %{summary.percent.toFixed(1)} tamamlandı •
              Kalan: ₺{formatCurrency(summary.totalTarget - summary.totalSaved)}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>✨ Yeni Hedef Ekle</Text>
          <Text style={styles.cardHint}>Hedefini belirle ve takip etmeye başla</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hedef Adı *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Tatil için birikim"
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hedef Tutar *</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>₺</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={targetAmount}
                onChangeText={text => setTargetAmount(text.replace(/[^0-9.,]/g, ''))}
                maxLength={10}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bitiş Tarihi (opsiyonel)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (Örn: 2026-12-31)"
              value={dueDateInput}
              onChangeText={setDueDateInput}
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notlar (opsiyonel)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Bu hedef için notlarınız..."
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {saving ? '⏳ Kaydediliyor...' : '💾 Hedefi Kaydet'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📊 Aktif Hedefler</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{groupedGoals.active.length}</Text>
          </View>
        </View>

        {groupedGoals.active.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyText}>Henüz aktif hedef yok</Text>
            <Text style={styles.emptyHint}>Yukarıdan yeni bir hedef ekleyerek başla</Text>
          </View>
        ) : (
          groupedGoals.active.map(goal => {
            const progress = calculateProgress(goal);
            const remaining = getRemainingAmount(goal);
            const isUpdating = updatingGoals.has(goal.id);

            return (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalHeaderLeft}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalMeta}>
                      Hedef: ₺{formatCurrency(goal.targetAmount)} •
                      Biriken: ₺{formatCurrency(goal.currentAmount)}
                    </Text>
                    {goal.dueDate && (
                      <Text style={styles.goalDate}>
                        📅 Bitiş: {formatDate(goal.dueDate)}
                      </Text>
                    )}
                    {goal.note ? (
                      <Text style={styles.goalNote}>💭 {goal.note}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={[styles.statusBadge, styles.statusActive]}
                    onPress={() => toggleStatus(goal, GoalStatus.COMPLETED)}
                    disabled={isUpdating}
                  >
                    <Text style={styles.statusText}>
                      {isUpdating ? '⏳' : '✓'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.goalProgressSection}>
                  <View style={styles.progressBarOuter}>
                    <View style={[
                      styles.progressBarInner,
                      { width: `${progress}%` },
                      progress >= 75 && styles.progressBarSuccess,
                      progress >= 90 && styles.progressBarAlmostDone
                    ]} />
                  </View>
                  <View style={styles.progressInfoRow}>
                    <Text style={styles.goalProgressText}>
                      %{progress.toFixed(1)} • Kalan: ₺{formatCurrency(remaining)}
                    </Text>
                    <Text style={styles.motivationText}>{getMotivationMessage(progress)}</Text>
                  </View>
                </View>

                {showQuickAmounts[goal.id] && (
                  <View style={styles.quickAmountButtons}>
                    {quickAmounts.map(amt => (
                      <TouchableOpacity
                        key={amt}
                        style={styles.quickAmountButton}
                        onPress={() => handleQuickAmountAdd(goal, amt)}
                        disabled={isUpdating}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.quickAmountText}>+₺{amt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.progressInputRow}>
                  <View style={styles.amountRowSmall}>
                    <Text style={styles.currencySmall}>₺</Text>
                    <TextInput
                      style={[styles.input, styles.progressInput]}
                      placeholder="Tutar ekle"
                      keyboardType="decimal-pad"
                      value={progressInputs[goal.id] || ''}
                      onChangeText={text =>
                        setProgressInputs(prev => ({
                          ...prev,
                          [goal.id]: text.replace(/[^0-9.,]/g, '')
                        }))
                      }
                      editable={!isUpdating}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.quickButton, isUpdating && styles.buttonDisabled]}
                    onPress={() => toggleQuickAmounts(goal.id)}
                    disabled={isUpdating}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.quickButtonText}>⚡</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addButton, isUpdating && styles.buttonDisabled]}
                    onPress={() => handleAddProgress(goal)}
                    disabled={isUpdating}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addButtonText}>
                      {isUpdating ? '⏳' : '+ Ekle'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.goalActionRow}>
                  <TouchableOpacity
                    style={[styles.cancelButton, isUpdating && styles.buttonDisabled]}
                    onPress={() => handleCancelGoal(goal)}
                    disabled={isUpdating}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelButtonText}>❌ İptal Et</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButtonSmall, isUpdating && styles.buttonDisabled]}
                    onPress={() => handleDelete(goal)}
                    disabled={isUpdating}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.deleteTextSmall}>🗑️ Sil</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {groupedGoals.completed.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>✅ Tamamlanan</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{groupedGoals.completed.length}</Text>
              </View>
            </View>
            {groupedGoals.completed.map(goal => (
              <View key={goal.id} style={styles.goalCardMuted}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalHeaderLeft}>
                    <Text style={styles.goalTitle}>🎉 {goal.title}</Text>
                    <Text style={styles.goalMeta}>
                      Tamamlanan: ₺{formatCurrency(goal.targetAmount)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.statusBadge, styles.statusDone]}
                    onPress={() => toggleStatus(goal, GoalStatus.ACTIVE)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.statusText}>↺</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {groupedGoals.cancelled.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>❌ İptal Edilen</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{groupedGoals.cancelled.length}</Text>
              </View>
            </View>
            {groupedGoals.cancelled.map(goal => (
              <View key={goal.id} style={styles.goalCardMuted}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalHeaderLeft}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalMeta}>
                      Hedef: ₺{formatCurrency(goal.targetAmount)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.statusBadge, styles.statusDone]}
                    onPress={() => toggleStatus(goal, GoalStatus.ACTIVE)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.statusText}>↺</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
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
    marginTop: 4
  },
  summaryCard: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  summaryItem: {
    flex: 1
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500'
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginTop: 6
  },
  positive: {
    color: '#10B981'
  },
  progressBarOuter: {
    marginTop: 14,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    height: 12,
    overflow: 'hidden'
  },
  progressBarInner: {
    backgroundColor: '#2563EB',
    height: '100%',
    borderRadius: 10
  },
  progressBarSuccess: {
    backgroundColor: '#10B981'
  },
  progressBarAlmostDone: {
    backgroundColor: '#F59E0B'
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  motivationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981'
  },
  progressText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500'
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  cardTitle: {
    fontSize: 19,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827'
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  amountRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  currency: {
    fontSize: 20,
    marginRight: 8,
    color: '#6B7280',
    fontWeight: '600'
  },
  currencySmall: {
    fontSize: 16,
    marginRight: 6,
    color: '#6B7280',
    fontWeight: '600'
  },
  amountInput: {
    flex: 1
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563EB',
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
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.5
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827'
  },
  countBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE'
  },
  countBadgeText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 13
  },
  emptyState: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827'
  },
  emptyHint: {
    marginTop: 6,
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 14
  },
  goalCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  goalCardMuted: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12
  },
  goalHeaderLeft: {
    flex: 1
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4
  },
  goalMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4
  },
  goalDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4
  },
  goalNote: {
    marginTop: 6,
    color: '#374151',
    fontSize: 14,
    fontStyle: 'italic'
  },
  goalProgressSection: {
    marginBottom: 12
  },
  goalProgressText: {
    marginTop: 6,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500'
  },
  progressInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  progressInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15
  },
  addButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  },
  quickButton: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCD34D'
  },
  quickButtonText: {
    fontSize: 16
  },
  quickAmountButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap'
  },
  quickAmountButton: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE'
  },
  quickAmountText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 14
  },
  goalActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA'
  },
  cancelButtonText: {
    color: '#C2410C',
    fontWeight: '700',
    fontSize: 13
  },
  deleteButtonSmall: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  deleteTextSmall: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10
  },
  statusActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE'
  },
  statusDone: {
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#BBF7D0'
  },
  statusText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 16
  },
  sectionBlock: {
    marginTop: 8
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6'
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 16
  }
});