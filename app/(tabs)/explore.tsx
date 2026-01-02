import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { userProfile, updateUserProfile, signOut } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');

  // Sync form fields when profile comes in later (e.g., after async load)
  React.useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
    }
  }, [userProfile]);

  const handleSaveProfile = async () => {
    try {
      await updateUserProfile({
        displayName
      });
      Alert.alert('Başarılı', 'Profil güncellendi');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth/login');
          }
        }
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Ayarlar</Text>
      </View>

      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profil</Text>

        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Ad Soyad</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Ad Soyad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>E-posta</Text>
            <Text style={styles.emailText}>{userProfile?.email}</Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
            <Text style={styles.saveButtonText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Budget Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bütçe Ayarları</Text>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/budgets/categories')}
          >
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>📊</Text>
              <View>
                <Text style={styles.menuTitle}>Kategori Limitleri</Text>
                <Text style={styles.menuSubtitle}>Her kategori için aylık limit belirle</Text>
              </View>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/recurring/list')}
          >
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>🔄</Text>
              <View>
                <Text style={styles.menuTitle}>Tekrarlayan Harcamalar</Text>
                <Text style={styles.menuSubtitle}>Kira, faturalar ve abonelikler</Text>
              </View>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/tags/manage')}
          >
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>🏷️</Text>
              <View>
                <Text style={styles.menuTitle}>Etiket Yönetimi</Text>
                <Text style={styles.menuSubtitle}>Harcama ve gelirleri etiketle</Text>
              </View>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Uygulama Hakkında</Text>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versiyon</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Geliştirici</Text>
            <Text style={styles.infoValue}>Davut Umut</Text>
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>İstatistikler</Text>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hesap Oluşturulma</Text>
            <Text style={styles.infoValue}>
              {userProfile?.createdAt instanceof Date
                ? userProfile.createdAt.toLocaleDateString('tr-TR')
                : new Date((userProfile?.createdAt as any)?.seconds * 1000 || Date.now()).toLocaleDateString('tr-TR')
              }
            </Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Son Güncelleme</Text>
            <Text style={styles.infoValue}>
              {userProfile?.updatedAt instanceof Date
                ? userProfile.updatedAt.toLocaleDateString('tr-TR')
                : new Date((userProfile?.updatedAt as any)?.seconds * 1000 || Date.now()).toLocaleDateString('tr-TR')
              }
            </Text>
          </View>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Çıkış Yap</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  emailText: {
    fontSize: 16,
    color: '#666',
    paddingVertical: 12,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#333',
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  menuIcon: {
    fontSize: 24
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2
  },
  menuArrow: {
    fontSize: 24,
    color: '#9CA3AF'
  },  signOutButton: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
});
