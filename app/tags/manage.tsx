import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { tagService } from '../../services/tagService';
import { Tag, TagColors } from '../../types';

export default function TagsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TagColors[0].value);
  const [selectedIcon, setSelectedIcon] = useState('');
  const [saving, setSaving] = useState(false);

  const commonIcons = ['📌', '⭐', '🔥', '💡', '🎯', '💰', '📅', '🚨', '✅', '🏷️', '📈', '💳'];

  useFocusEffect(
    useCallback(() => {
      loadTags();
    }, [user])
  );

  const loadTags = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const data = await tagService.getTags(user.uid);
      setTags(data);
    } catch (error) {
      console.error('Tags load error:', error);
      Alert.alert('Hata', 'Etiketler yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSelectedColor(TagColors[0].value);
    setSelectedIcon('');
    setEditingTag(null);
    setShowForm(false);
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setSelectedColor(tag.color);
    setSelectedIcon(tag.icon || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Hata', 'Oturum bulunamadı');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Eksik Bilgi', 'Etiket adı girin');
      return;
    }

    setSaving(true);
    try {
      if (editingTag) {
        await tagService.updateTag(editingTag.id, {
          name: name.trim(),
          color: selectedColor,
          icon: selectedIcon
        });
      } else {
        await tagService.addTag(user.uid, name.trim(), selectedColor, selectedIcon);
      }

      resetForm();
      await loadTags();
      Alert.alert('✅ Başarılı', editingTag ? 'Etiket güncellendi' : 'Etiket oluşturuldu');
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Hata', error.message || 'İşlem başarısız');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (tag: Tag) => {
    Alert.alert(
      'Sil',
      `"${tag.name}" etiketini silmek istiyor musun?\n\nNot: Bu etiket kullanan harcama/gelirlerden kaldırılacak.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await tagService.deleteTag(tag.id);
              setTags(prev => prev.filter(t => t.id !== tag.id));
              Alert.alert('✅ Silindi', 'Etiket kaldırıldı');
            } catch (error) {
              Alert.alert('Hata', 'Silinemedi');
            }
          }
        }
      ]
    );
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadTags();
          }}
          colors={['#2563EB']}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🏷️ Etiket Yönetimi</Text>
        <Text style={styles.subtitle}>Harcama ve gelirlerinizi etiketleyin</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>💡</Text>
        <Text style={styles.infoText}>
          Etiketler ile işlemlerinizi kategorilere göre daha detaylı gruplandırabilirsiniz.
        </Text>
      </View>

      {!showForm && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+ Yeni Etiket Oluştur</Text>
        </TouchableOpacity>
      )}

      {showForm && (
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
              {editingTag ? 'Etiket Düzenle' : 'Yeni Etiket'}
            </Text>
            <TouchableOpacity onPress={resetForm}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Etiket Adı *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Acil, Planlı, Tasarruf"
              value={name}
              onChangeText={setName}
              maxLength={20}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Renk Seç *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
              {TagColors.map((color) => (
                <TouchableOpacity
                  key={color.value}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color.value },
                    selectedColor === color.value && styles.colorOptionSelected
                  ]}
                  onPress={() => setSelectedColor(color.value)}
                >
                  {selectedColor === color.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>İkon Seç (opsiyonel)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
              <TouchableOpacity
                style={[styles.iconOption, selectedIcon === '' && styles.iconOptionSelected]}
                onPress={() => setSelectedIcon('')}
              >
                <Text style={styles.iconText}>Yok</Text>
              </TouchableOpacity>
              {commonIcons.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconOption, selectedIcon === icon && styles.iconOptionSelected]}
                  onPress={() => setSelectedIcon(icon)}
                >
                  <Text style={styles.iconEmoji}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Önizleme:</Text>
            <View style={[styles.tagChip, { backgroundColor: selectedColor }]}>
              {selectedIcon && <Text style={styles.tagIcon}>{selectedIcon}</Text>}
              <Text style={styles.tagText}>{name || 'Etiket Adı'}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? '⏳ Kaydediliyor...' : editingTag ? '💾 Güncelle' : '💾 Oluştur'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Etiketlerim</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{tags.length}</Text>
        </View>
      </View>

      {tags.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏷️</Text>
          <Text style={styles.emptyText}>Henüz etiket yok</Text>
          <Text style={styles.emptyHint}>Yukarıdan ekleyerek başla</Text>
        </View>
      ) : (
        <View style={styles.tagsGrid}>
          {tags.map(tag => (
            <View key={tag.id} style={styles.tagCard}>
              <View style={styles.tagCardHeader}>
                <View style={[styles.tagChip, { backgroundColor: tag.color }]}>
                  {tag.icon && <Text style={styles.tagIcon}>{tag.icon}</Text>}
                  <Text style={styles.tagText}>{tag.name}</Text>
                </View>
              </View>
              <View style={styles.tagCardActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(tag)}
                >
                  <Text style={styles.actionButtonText}>✏️ Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(tag)}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
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
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  backButtonText: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: '600'
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827'
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE'
  },
  infoIcon: {
    fontSize: 24
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20
  },
  addButton: {
    marginHorizontal: 20,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827'
  },
  closeButton: {
    fontSize: 24,
    color: '#9CA3AF'
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
  colorScroll: {
    marginHorizontal: -4
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  colorOptionSelected: {
    borderColor: '#111827',
    borderWidth: 3
  },
  checkmark: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  iconScroll: {
    marginHorizontal: -4
  },
  iconOption: {
    minWidth: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 4,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconOptionSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE'
  },
  iconEmoji: {
    fontSize: 24
  },
  iconText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600'
  },
  previewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center'
  },
  previewLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
    fontWeight: '600'
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6
  },
  tagIcon: {
    fontSize: 16
  },
  tagText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.5
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12
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
    textAlign: 'center'
  },
  tagsGrid: {
    marginHorizontal: 20,
    gap: 12
  },
  tagCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  tagCardHeader: {
    marginBottom: 12
  },
  tagCardActions: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  actionButtonText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 13
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  deleteButtonText: {
    fontSize: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6'
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280'
  }
});
