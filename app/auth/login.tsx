import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showResetEmail, setShowResetEmail] = useState(false);
    const [resetEmail, setResetEmail] = useState('');

    const { signIn, signUp, resetPassword } = useAuth();
    const router = useRouter();

    // Validasyonlar
    const validateEmail = (text: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
    const validatePassword = (text: string) => text.length >= 6;

    const handleSubmit = async () => {
        if (!email.trim() || !password.trim() || (!isLogin && !displayName.trim())) {
            Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun');
            return;
        }

        if (!validateEmail(email)) {
            Alert.alert('Geçersiz E-posta', 'Lütfen geçerli bir e-posta adresi girin');
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                await signIn(email.trim(), password);
                router.replace('/(tabs)');
            } else {
                await signUp(email.trim(), password, displayName.trim());
                // Kayıt başarılı, giriş sayfasına dön
                Alert.alert(
                    'Kayıt Başarılı',
                    'E-posta doğrulama maili gönderildi. Lütfen e-postanızı kontrol edin ve doğrulama linkine tıklayın. Ardından giriş yapabilirsiniz.',
                    [
                        {
                            text: 'Tamam',
                            onPress: () => {
                                setEmail('');
                                setPassword('');
                                setDisplayName('');
                                setIsLogin(true);
                            }
                        }
                    ]
                );
            }
        } catch (error: any) {
            // Firebase error kodlarını Türkçeye çevir
            let errorTitle = 'Hata';
            let errorMessage = error.message || 'Bir hata oluştu';

            // Email already in use hatası
            if (error.code === 'auth/email-already-in-use' || errorMessage.includes('email-already-in-use')) {
                errorTitle = 'E-posta Zaten Kayıtlı';
                errorMessage = 'Bu e-posta adresi daha önce kayıt olmuş. Giriş yapmak mı istiyorsunuz?';
                Alert.alert(errorTitle, errorMessage, [
                    {
                        text: 'Giriş Yap',
                        onPress: () => {
                            setPassword('');
                            setDisplayName('');
                            setIsLogin(true);
                            setFocusedField(null);
                        },
                        style: 'default'
                    },
                    {
                        text: 'İptal',
                        onPress: () => { },
                        style: 'cancel'
                    }
                ]);
                setLoading(false);
                return;
            }

            // Zayıf şifre hatası
            if (error.code === 'auth/weak-password' || errorMessage.includes('weak-password')) {
                errorTitle = 'Zayıf Şifre';
                errorMessage = 'Şifreniz en az 6 karakter olmalıdır ve daha güçlü bir şifre seçmelisiniz.';
            }

            // Geçersiz email hatası
            if (error.code === 'auth/invalid-email' || errorMessage.includes('invalid-email')) {
                errorTitle = 'Geçersiz E-posta';
                errorMessage = 'Lütfen geçerli bir e-posta adresi girin.';
            }

            // Kullanıcı bulunamadı hatası
            if (error.code === 'auth/user-not-found' || errorMessage.includes('user-not-found')) {
                errorTitle = 'Kullanıcı Bulunamadı';
                errorMessage = 'Bu e-posta adresiyle kayıtlı bir hesap yok. Kayıt olmak mı istiyorsunuz?';
                Alert.alert(errorTitle, errorMessage, [
                    {
                        text: 'Kayıt Ol',
                        onPress: () => {
                            setPassword('');
                            setDisplayName('');
                            setIsLogin(false);
                            setFocusedField(null);
                        },
                        style: 'default'
                    },
                    {
                        text: 'İptal',
                        onPress: () => { },
                        style: 'cancel'
                    }
                ]);
                setLoading(false);
                return;
            }

            // Yanlış şifre hatası
            if (error.code === 'auth/wrong-password' || errorMessage.includes('wrong-password')) {
                errorTitle = 'Yanlış Şifre';
                errorMessage = 'Girdiğiniz şifre hatalı. Lütfen tekrar deneyin.';
            }

            Alert.alert(errorTitle, errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setEmail('');
        setPassword('');
        setDisplayName('');
        setFocusedField(null);
    };

    const handleResetPassword = async () => {
        if (!resetEmail.trim()) {
            Alert.alert('Hata', 'Lütfen e-posta adresinizi girin');
            return;
        }

        setLoading(true);
        try {
            await resetPassword(resetEmail);
            Alert.alert('Başarılı', 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi');
            setShowResetEmail(false);
            setResetEmail('');
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Şifre sıfırlama başarısız oldu');
        } finally {
            setLoading(false);
        }
    };

    // Buton aktiflik kontrolü
    const isFormValid = isLogin
        ? (email.trim() && password.length >= 6)
        : (email.trim() && password.length >= 6 && displayName.trim().length >= 2);

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Text style={styles.icon}>💸</Text>
                        </View>
                        <Text style={styles.title}>Harcama Takip</Text>
                        <Text style={styles.subtitle}>
                            {isLogin ? 'Hesabına giriş yap' : 'Yeni hesap oluştur'}
                        </Text>
                    </View>

                    <View style={styles.form}>
                        {/* AD SOYAD (Sadece Kayıt Modunda) */}
                        {!isLogin && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Ad Soyad</Text>
                                <View style={[
                                    styles.inputWrapper,
                                    focusedField === 'displayName' && styles.inputWrapperFocused
                                ]}>
                                    <Text style={styles.inputIcon}>👤</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Adınız ve Soyadınız"
                                        placeholderTextColor="#999"
                                        value={displayName}
                                        onChangeText={setDisplayName}
                                        autoCapitalize="words"
                                        onFocus={() => setFocusedField('displayName')}
                                        onBlur={() => setFocusedField(null)}
                                        editable={!loading}
                                    />
                                </View>
                            </View>
                        )}

                        {/* E-POSTA */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>E-posta</Text>
                            <View style={[
                                styles.inputWrapper,
                                focusedField === 'email' && styles.inputWrapperFocused,
                                (email.length > 0 && !validateEmail(email)) && styles.inputWrapperError
                            ]}>
                                <Text style={styles.inputIcon}>📧</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="ornek@email.com"
                                    placeholderTextColor="#999"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        {/* ŞİFRE */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Şifre</Text>
                            <View style={[
                                styles.inputWrapper,
                                focusedField === 'password' && styles.inputWrapperFocused,
                                (password.length > 0 && !validatePassword(password)) && styles.inputWrapperError
                            ]}>
                                <Text style={styles.inputIcon}>🔒</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="En az 6 karakter"
                                    placeholderTextColor="#999"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeButton}
                                >
                                    <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                                </TouchableOpacity>
                            </View>
                            {isLogin && (
                                <TouchableOpacity
                                    onPress={() => setShowResetEmail(true)}
                                    style={styles.forgotPasswordButton}
                                >
                                    <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* SUBMIT BUTTON */}
                        <TouchableOpacity
                            style={[
                                styles.button,
                                (!isFormValid || loading) && styles.buttonDisabled
                            ]}
                            onPress={handleSubmit}
                            disabled={!isFormValid || loading}
                        >
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator color="#fff" size="small" />
                                    <Text style={styles.loadingText}>İşleniyor...</Text>
                                </View>
                            ) : (
                                <Text style={styles.buttonText}>
                                    {isLogin ? '🚀 Giriş Yap' : '✨ Kayıt Ol'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>veya</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity
                            style={styles.switchButton}
                            onPress={toggleMode}
                            disabled={loading}
                        >
                            <Text style={styles.switchText}>
                                {isLogin ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}
                                <Text style={styles.switchTextBold}>
                                    {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            {isLogin
                                ? '🔐 Güvenli giriş için bilgilerinizi kullanın'
                                : '🎉 Aramıza katıl ve bütçeni yönetmeye başla'}
                        </Text>
                    </View>
                </ScrollView>

                {/* Şifre Sıfırlama Modali */}
                {showResetEmail && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => {
                                    setShowResetEmail(false);
                                    setResetEmail('');
                                }}
                            >
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>

                            <Text style={styles.modalTitle}>Şifremi Unuttum</Text>
                            <Text style={styles.modalSubtitle}>
                                E-posta adresinizi girin, şifre sıfırlama bağlantısı gönderelim
                            </Text>

                            <TextInput
                                style={styles.modalInput}
                                placeholder="E-posta adresiniz"
                                placeholderTextColor="#999"
                                value={resetEmail}
                                onChangeText={setResetEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!loading}
                            />

                            <TouchableOpacity
                                style={[styles.modalButton, loading && styles.modalButtonDisabled]}
                                onPress={handleResetPassword}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalButtonText}>Sıfırlama Bağlantısı Gönder</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    setShowResetEmail(false);
                                    setResetEmail('');
                                }}
                            >
                                <Text style={styles.modalCancelText}>İptal</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: Platform.OS === 'ios' ? 80 : 50,
        // Klavye açıldığında zıplamayı önlemek için justifyContent: 'center' kaldırıldı
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#007AFF',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            }
        })
    },
    icon: { fontSize: 35 },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
    },
    form: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.05,
                shadowRadius: 15,
            },
            android: {
                elevation: 4,
            }
        })
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#444',
        marginBottom: 6,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#F0F0F0',
        borderRadius: 14,
        backgroundColor: '#FBFBFB',
        paddingHorizontal: 12,
        height: 54
    },
    inputWrapperFocused: {
        borderColor: '#007AFF',
        backgroundColor: '#fff',
    },
    inputWrapperError: {
        borderColor: '#FF3B30',
    },
    inputIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1A1A1A',
    },
    eyeButton: {
        padding: 8,
    },
    eyeIcon: { fontSize: 18 },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: '#A2CFFE',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginLeft: 8,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#F0F0F0',
    },
    dividerText: {
        marginHorizontal: 12,
        fontSize: 12,
        color: '#BBB',
    },
    switchButton: {
        alignItems: 'center',
    },
    forgotPasswordButton: {
        marginTop: 12,
        alignItems: 'flex-end',
    },
    forgotPasswordText: {
        color: '#007AFF',
        fontSize: 13,
        fontWeight: '600',
    },
    switchText: {
        color: '#666',
        fontSize: 14,
    },
    switchTextBold: {
        color: '#007AFF',
        fontWeight: '700',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        zIndex: 100,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        maxHeight: '60%',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 20,
        color: '#666',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    modalButton: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
        marginBottom: 12,
    },
    modalButtonDisabled: {
        opacity: 0.6,
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalCancelText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    footer: {
        marginTop: 24,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#999',
    },
});