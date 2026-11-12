import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

const AVATAR_PRESETS = [
  '💼', '🚀', '💎', '👑',
  '🦁', '⚡', '🛡️', '🎯',
  '🦊', '🔥', '🎩', '💰',
  '🤖', '🥋', '🌟', '🦉',
];

export default function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const { user, updateUserProfile } = useAuth();

  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user && visible) {
      setName(user.name || '');
      const currentAvatar = user.avatarUrl || '';
      setAvatarUrl(currentAvatar);
      if (currentAvatar.startsWith('http://') || currentAvatar.startsWith('https://')) {
        setCustomUrlInput(currentAvatar);
        setIsUrlMode(true);
      } else {
        setCustomUrlInput('');
        setIsUrlMode(false);
      }
      setErrorMessage('');
    }
  }, [user, visible]);

  const handleSelectPreset = (emoji: string) => {
    setAvatarUrl(emoji);
    setIsUrlMode(false);
  };

  const handleClearAvatar = () => {
    setAvatarUrl('');
    setCustomUrlInput('');
    setIsUrlMode(false);
  };

  const handleApplyCustomUrl = (url: string) => {
    setCustomUrlInput(url);
    setAvatarUrl(url.trim());
  };

  const handleSave = async () => {
    setErrorMessage('');
    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMessage('Informe o seu nome ou apelido.');
      return;
    }

    try {
      setIsSaving(true);
      const res = await updateUserProfile({
        name: trimmedName,
        avatarUrl: avatarUrl.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Erro ao atualizar perfil.');
        return;
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao salvar perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const isHttpAvatar = avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://');
  const userInitial = name.trim() ? name.trim().charAt(0).toUpperCase() : (user?.name?.charAt(0).toUpperCase() || 'U');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Text style={styles.headerLabel}>CUSTOMIZAR PERFIL</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeCircle}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.mainTitle}>Editar Perfil</Text>
          <Text style={styles.mainSubtitle}>
            Atualize seu nome de exibição e escolha um avatar personalizado.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {errorMessage}</Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Avatar Preview Card */}
            <View style={styles.previewCard}>
              <View style={styles.avatarPreview}>
                {isHttpAvatar ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    onError={() => setErrorMessage('Não foi possível carregar a imagem da URL.')}
                  />
                ) : avatarUrl ? (
                  <Text style={styles.avatarEmoji}>{avatarUrl}</Text>
                ) : (
                  <Text style={styles.avatarInitial}>{userInitial}</Text>
                )}
              </View>
              <Text style={styles.previewName}>{name.trim() || 'Seu Nome'}</Text>
              <Text style={styles.previewEmail}>{user?.email || 'usuario@smartfinance.app'}</Text>
            </View>

            {/* Nome do Usuário */}
            <Text style={styles.fieldLabel}>NOME OU APELIDO</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Miguel Nunes"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Seleção de Avatar Presets */}
            <View style={styles.avatarSectionHeader}>
              <Text style={styles.fieldLabel}>ESCOLHA UM ÍCONE / MEMOJI</Text>
              <TouchableOpacity onPress={handleClearAvatar}>
                <Text style={styles.resetAvatarText}>Usar Inicial</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.presetsGrid}>
              {AVATAR_PRESETS.map(emoji => {
                const isSelected = avatarUrl === emoji;
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.presetItem, isSelected && styles.presetItemSelected]}
                    onPress={() => handleSelectPreset(emoji)}>
                    <Text style={styles.presetEmojiText}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Alternar URL de Imagem Personalizada */}
            <TouchableOpacity
              style={styles.toggleUrlModeBtn}
              onPress={() => setIsUrlMode(!isUrlMode)}>
              <Text style={styles.toggleUrlModeText}>
                {isUrlMode ? '▲ Ocultar link de imagem' : '▼ Ou use um link de foto externa (HTTPS)'}
              </Text>
            </TouchableOpacity>

            {isUrlMode && (
              <View style={styles.urlInputBox}>
                <Text style={styles.inputSubLabel}>LINK DA FOTO (URL DIRETA .PNG / .JPG)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://exemplo.com/minha-foto.png"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={customUrlInput}
                  onChangeText={handleApplyCustomUrl}
                />
              </View>
            )}

            {/* Botão de Salvar */}
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              activeOpacity={0.85}
              disabled={isSaving}
              onPress={handleSave}>
              {isSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>SALVAR ALTERAÇÕES</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  mainTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  mainSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderColor: Colors.expense,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: Colors.expense,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollBody: {
    paddingBottom: 30,
  },
  previewCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  avatarEmoji: {
    fontSize: 34,
  },
  avatarInitial: {
    color: '#000000',
    fontSize: 30,
    fontWeight: '900',
  },
  previewName: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  previewEmail: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
  },
  avatarSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 4,
  },
  resetAvatarText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: Colors.surfaceCard,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 6,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
    marginTop: 4,
  },
  presetItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceHover,
    borderWidth: 2,
  },
  presetEmojiText: {
    fontSize: 20,
  },
  toggleUrlModeBtn: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  toggleUrlModeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  urlInputBox: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputSubLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
