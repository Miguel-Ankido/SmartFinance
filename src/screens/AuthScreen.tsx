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
import { normalizeOtpCode } from '../utils/profileBudgetUtils';

const LOGO_IMG = require('../assets/logo.png');

type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT';
type ForgotStep = 'REQUEST_EMAIL' | 'VERIFY_CODE' | 'NEW_PASSWORD';

export default function AuthScreen() {
  const {
    login,
    register,
    requestPasswordResetCode,
    verifyPasswordResetCode,
    completePasswordReset,
    cancelPasswordRecovery,
    isPasswordRecovery,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>(() =>
    isPasswordRecovery ? 'FORGOT' : 'LOGIN',
  );
  const [forgotStep, setForgotStep] = useState<ForgotStep>(() =>
    isPasswordRecovery ? 'NEW_PASSWORD' : 'REQUEST_EMAIL',
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [monthlyIncomeStr, setMonthlyIncomeStr] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
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

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }
    const timer = setTimeout(() => setResendCooldown(prev => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleOpenForgot = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setOtpCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotStep(isPasswordRecovery ? 'NEW_PASSWORD' : 'REQUEST_EMAIL');
    setMode('FORGOT');
  };

  const handleBackToLogin = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setOtpCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    await cancelPasswordRecovery();
    setMode('LOGIN');
    setForgotStep('REQUEST_EMAIL');
  };

  const handleSendResetCode = async (isResend = false) => {
    Keyboard.dismiss();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Informe um e-mail cadastrado válido.');
      return;
    }

    setLoading(true);
    const res = await requestPasswordResetCode(cleanEmail);
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Não foi possível enviar o código.');
      return;
    }

    setResendCooldown(60);
    setForgotStep('VERIFY_CODE');
    setSuccessMessage(
      isResend
        ? `Novo código enviado! Caso ${cleanEmail} esteja cadastrado, verifique sua caixa de entrada e spam.`
        : `Enviamos um código de recuperação para ${cleanEmail} (caso esteja cadastrado). Verifique a caixa de entrada e spam.`,
    );
  };

  const handleVerifyCode = async () => {
    Keyboard.dismiss();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanCode = normalizeOtpCode(otpCode);
    if (cleanCode.length < 6) {
      setErrorMessage('Digite o código completo recebido no e-mail.');
      return;
    }

    setLoading(true);
    const res = await verifyPasswordResetCode(email, cleanCode);
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Código inválido ou expirado.');
      return;
    }

    setForgotStep('NEW_PASSWORD');
    setSuccessMessage('Código validado! Agora cadastre sua nova senha de acesso.');
  };

  const handleSaveNewPassword = async () => {
    Keyboard.dismiss();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);
    const res = await completePasswordReset(newPassword);
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Erro ao redefinir a senha.');
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setOtpCode('');
    setMode('LOGIN');
    setForgotStep('REQUEST_EMAIL');
    setSuccessMessage('Senha atualizada com sucesso! Entre agora com sua nova senha.');
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setErrorMessage('');
    setSuccessMessage('');

    if (mode === 'FORGOT') {
      if (forgotStep === 'REQUEST_EMAIL') {
        await handleSendResetCode(false);
      } else if (forgotStep === 'VERIFY_CODE') {
        await handleVerifyCode();
      } else {
        await handleSaveNewPassword();
      }
      return;
    }

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
      const cleanIncome = monthlyIncomeStr
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^0-9.]/g, '');
      const parsedIncome = parseFloat(cleanIncome);
      const validIncome = !isNaN(parsedIncome) && parsedIncome > 0 ? parsedIncome : undefined;

      const res = await register(name.trim(), email.trim(), password, validIncome);
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

  const renderCardTitle = () => {
    if (mode === 'REGISTER') return 'Comece Gratuitamente';
    if (mode === 'FORGOT') {
      if (forgotStep === 'REQUEST_EMAIL') return 'Recuperar Senha';
      if (forgotStep === 'VERIFY_CODE') return 'Validar Código';
      return 'Definir Nova Senha';
    }
    return 'Acesse sua Conta';
  };

  const renderCardSubtitle = () => {
    if (mode === 'REGISTER') return 'Gerencie gastos automáticos e limites em um só lugar';
    if (mode === 'FORGOT') {
      if (forgotStep === 'REQUEST_EMAIL') {
        return 'Enviaremos um código de verificação diretamente para o e-mail cadastrado.';
      }
      if (forgotStep === 'VERIFY_CODE') {
        return `Digite o código enviado para ${email.trim().toLowerCase()}`;
      }
      return 'Escolha uma nova senha segura com pelo menos 6 caracteres.';
    }
    return 'Informe seus dados para acessar suas finanças';
  };

  const renderPrimaryButtonLabel = () => {
    if (mode === 'REGISTER') return 'CRIAR CONTA SYNCPAY';
    if (mode === 'FORGOT') {
      if (forgotStep === 'REQUEST_EMAIL') return 'ENVIAR CÓDIGO POR E-MAIL';
      if (forgotStep === 'VERIFY_CODE') return 'CONFIRMAR CÓDIGO';
      return 'SALVAR NOVA SENHA';
    }
    return 'ACESSAR CONTA';
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
          {mode !== 'FORGOT' && (
            <View style={styles.modeSwitcher}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'LOGIN' && styles.modeButtonActive]}
                onPress={() => {
                  setMode('LOGIN');
                  setErrorMessage('');
                  setSuccessMessage('');
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
                  setSuccessMessage('');
                }}>
                <Text
                  style={[styles.modeButtonText, mode === 'REGISTER' && styles.modeButtonTextActive]}>
                  CRIAR CONTA
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Formulário */}
          <View style={styles.card}>
            {mode === 'FORGOT' && (
              <View style={styles.stepIndicatorRow}>
                <View
                  style={[
                    styles.stepPill,
                    forgotStep === 'REQUEST_EMAIL' && styles.stepPillActive,
                  ]}>
                  <Text
                    style={[
                      styles.stepPillText,
                      forgotStep === 'REQUEST_EMAIL' && styles.stepPillTextActive,
                    ]}>
                    1. E-mail
                  </Text>
                </View>
                <View
                  style={[
                    styles.stepPill,
                    forgotStep === 'VERIFY_CODE' && styles.stepPillActive,
                  ]}>
                  <Text
                    style={[
                      styles.stepPillText,
                      forgotStep === 'VERIFY_CODE' && styles.stepPillTextActive,
                    ]}>
                    2. Código
                  </Text>
                </View>
                <View
                  style={[
                    styles.stepPill,
                    forgotStep === 'NEW_PASSWORD' && styles.stepPillActive,
                  ]}>
                  <Text
                    style={[
                      styles.stepPillText,
                      forgotStep === 'NEW_PASSWORD' && styles.stepPillTextActive,
                    ]}>
                    3. Nova Senha
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.cardTitle}>{renderCardTitle()}</Text>
            <Text style={styles.cardSubtitle}>{renderCardSubtitle()}</Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>✓ {successMessage}</Text>
              </View>
            ) : null}

            {mode === 'FORGOT' ? (
              <>
                {forgotStep === 'REQUEST_EMAIL' && (
                  <>
                    <Text style={styles.inputLabel}>E-MAIL CADASTRADO</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="seu.email@exemplo.com"
                      placeholderTextColor={Colors.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </>
                )}

                {forgotStep === 'VERIFY_CODE' && (
                  <>
                    <Text style={styles.inputLabel}>CÓDIGO RECEBIDO NO E-MAIL</Text>
                    <TextInput
                      style={[styles.input, styles.otpInput]}
                      placeholder="000000"
                      placeholderTextColor={Colors.textMuted}
                      value={otpCode}
                      onChangeText={text => setOtpCode(normalizeOtpCode(text))}
                      keyboardType="number-pad"
                      maxLength={8}
                    />

                    <View style={styles.otpActionsRow}>
                      <TouchableOpacity
                        disabled={resendCooldown > 0 || loading}
                        onPress={() => handleSendResetCode(true)}>
                        <Text
                          style={[
                            styles.linkActionText,
                            resendCooldown > 0 && styles.linkActionDisabled,
                          ]}>
                          {resendCooldown > 0
                            ? `Reenviar código em ${resendCooldown}s`
                            : 'Reenviar código'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={loading}
                        onPress={() => {
                          setErrorMessage('');
                          setSuccessMessage('');
                          setForgotStep('REQUEST_EMAIL');
                        }}>
                        <Text style={styles.secondaryLinkText}>Trocar e-mail</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {forgotStep === 'NEW_PASSWORD' && (
                  <>
                    <Text style={styles.inputLabel}>NOVA SENHA</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor={Colors.textMuted}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                    />

                    <Text style={styles.inputLabel}>CONFIRMAR NOVA SENHA</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Repita a nova senha"
                      placeholderTextColor={Colors.textMuted}
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                      secureTextEntry
                    />
                  </>
                )}
              </>
            ) : (
              <>
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

                <View style={styles.passwordLabelRow}>
                  <Text style={styles.inputLabel}>SENHA</Text>
                  {mode === 'LOGIN' && (
                    <TouchableOpacity onPress={handleOpenForgot} activeOpacity={0.7}>
                      <Text style={styles.forgotLinkText}>Esqueci minha senha</Text>
                    </TouchableOpacity>
                  )}
                </View>
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

                    <Text style={styles.inputLabel}>RENDA MENSAL ESTIMADA (OPCIONAL)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: 4500 ou 4.500,00"
                      placeholderTextColor={Colors.textMuted}
                      value={monthlyIncomeStr}
                      onChangeText={setMonthlyIncomeStr}
                      keyboardType="numeric"
                    />
                    <Text style={styles.incomeHint}>
                      💡 Baliza seus limites de gastos e alerta quando suas metas ou despesas ultrapassarem seus ganhos.
                    </Text>
                  </>
                ) : null}
              </>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.actionButtonText}>{renderPrimaryButtonLabel()}</Text>
              )}
            </TouchableOpacity>

            {mode === 'FORGOT' && (
              <TouchableOpacity
                style={styles.backToLoginBtn}
                onPress={handleBackToLogin}
                disabled={loading}>
                <Text style={styles.backToLoginText}>← Voltar para o Login</Text>
              </TouchableOpacity>
            )}
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
    color: '#ffffff',
    fontWeight: '800',
  },
  card: {
    backgroundColor: Colors.surfaceCard,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  stepPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  stepPillActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  stepPillText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  stepPillTextActive: {
    color: Colors.primary,
    fontWeight: '800',
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
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  successText: {
    color: Colors.income,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  forgotLinkText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
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
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    height: 54,
  },
  otpActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  linkActionText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  linkActionDisabled: {
    color: Colors.textMuted,
  },
  secondaryLinkText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  incomeHint: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
    marginBottom: 4,
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
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  backToLoginBtn: {
    marginTop: 14,
    paddingVertical: 6,
    alignItems: 'center',
  },
  backToLoginText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
});