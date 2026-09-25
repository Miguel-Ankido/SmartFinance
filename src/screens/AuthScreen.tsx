import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const LOGO_IMG = require('../assets/SyncPayBlack.jpg');

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setErrorMessage('');

    if (mode === 'REGISTER') {
      if (!name.trim()) {
        setErrorMessage('Por favor, informe seu nome completo.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Informe um e-mail válido.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('As senhas não coincidem.');
        return;
      }

      setLoading(true);
      const res = await register(name.trim(), email.trim(), password);
      setLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Erro ao criar conta.');
      }
    } else {
      if (!email.trim() || !password) {
        setErrorMessage('Informe seu e-mail e senha.');
        return;
      }

      setLoading(true);
      const res = await login(email.trim(), password);
      setLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Credenciais inválidas.');
      }
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          
          {/* Cabeçalho da Marca SyncPay */}
          {!isKeyboardVisible ? (
            <View style={styles.brandContainer}>
              <Image source={LOGO_IMG} style={styles.brandLogo} resizeMode="contain" />
              <Text style={styles.appTagline}>A SUA VIDA FINANCEIRA INTELIGENTE</Text>
            </View>
          ) : (
            <View style={styles.brandContainerCompact}>
              <Image source={LOGO_IMG} style={styles.brandLogoCompact} resizeMode="contain" />
            </View>
          )}

          {/* Alternador de Modo: Entrar / Criar Conta */}
          <View style={styles.modeSwitcher}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'LOGIN' && styles.modeButtonActive]}
              onPress={() => {
                setMode('LOGIN');
                setErrorMessage('');
              }}>
              <Text style={[styles.modeButtonText, mode === 'LOGIN' && styles.modeButtonTextActive]}>
                ENTRAR
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'REGISTER' && styles.modeButtonActive]}
              onPress={() => {
                setMode('REGISTER');
                setErrorMessage('');
              }}>
              <Text style={[styles.modeButtonText, mode === 'REGISTER' && styles.modeButtonTextActive]}>
                CRIAR CONTA
              </Text>
            </TouchableOpacity>
          </View>

          {/* Formulário */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {mode === 'LOGIN' ? 'Acesse sua Conta' : 'Comece Gratuitamente'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {mode === 'LOGIN'
                ? 'Informe seus dados para acessar suas finanças'
                : 'Gerencie gastos automáticos e limites em um só lugar'}
            </Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {errorMessage}</Text>
              </View>
            ) : null}

            {mode === 'REGISTER' ? (
              <>
                <Text style={styles.inputLabel}>NOME COMPLETO</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Miguel Nunes"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </>
            ) : null}

            <Text style={styles.inputLabel}>E-MAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="seu.email@exemplo.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>SENHA</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {mode === 'REGISTER' ? (
              <>
                <Text style={styles.inputLabel}>CONFIRME SUA SENHA</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </>
            ) : null}

            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.actionButtonText}>
                  {mode === 'LOGIN' ? 'ACESSAR CONTA' : 'CRIAR CONTA SYNCPAY'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 140,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  brandLogo: {
    width: 140,
    height: 140,
  },
  appTagline: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  brandContainerCompact: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 2,
  },
  brandLogoCompact: {
    width: 60,
    height: 60,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
  },
  modeButtonText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  modeButtonTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  card: {
    backgroundColor: Colors.surfaceCard,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  errorBox: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  errorText: {
    color: Colors.expense,
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 16,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  actionButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});