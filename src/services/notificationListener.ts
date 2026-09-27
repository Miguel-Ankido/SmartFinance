import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type { Transaction } from '../types/database';
import { parseNotification } from './parser';

const { NotificationModule } = NativeModules;

const notificationEmitter =
  Platform.OS === 'android' && NotificationModule
    ? new NativeEventEmitter(NotificationModule)
    : null;

const NOTIFICATION_EVENT = 'onNotificationReceived';

export interface NativeNotificationPayload {
  packageName: string;
  title: string;
  text: string;
  postTime?: number;
}

export interface CapturedBankTransaction extends Transaction {
  bankName: string;
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random % 4) + 8;

    return value.toString(16);
  });
}

function isValidPayload(payload: unknown): payload is NativeNotificationPayload {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as Partial<NativeNotificationPayload>;
  return (
    typeof candidate.packageName === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.text === 'string'
  );
}

function toIsoDate(postTime?: number): { date: string; updatedAt: string } {
  const now = new Date();
  const receivedAt =
    typeof postTime === 'number' && Number.isFinite(postTime)
      ? new Date(postTime)
      : now;

  return {
    date: Number.isNaN(receivedAt.getTime()) ? now.toISOString() : receivedAt.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function createCapturedBankTransaction(
  userId: string,
  payload: unknown,
): CapturedBankTransaction | null {
  if (!isValidPayload(payload)) {
    return null;
  }

  const parsed = parseNotification(payload.packageName, payload.title, payload.text);
  if (!parsed) {
    return null;
  }

  const { date, updatedAt } = toIsoDate(payload.postTime);
  return {
    id: generateUuid(),
    user_id: userId,
    amount: parsed.amount,
    type: parsed.type,
    payment_method: parsed.paymentMethod,
    merchant: parsed.merchant,
    description: `Automatic capture (${parsed.bankName})`,
    date,
    is_business: false,
    synced_at: null,
    updated_at: updatedAt,
    is_deleted: false,
    bankName: parsed.bankName,
  };
}

export function subscribeToBankNotifications(
  userId: string,
  onNewTransaction: (transaction: CapturedBankTransaction) => void,
): () => void {
  if (!notificationEmitter) {
    return () => undefined;
  }

  const subscription = notificationEmitter.addListener(NOTIFICATION_EVENT, (payload: unknown) => {
    const transaction = createCapturedBankTransaction(userId, payload);
    if (transaction) {
      onNewTransaction(transaction);
    }
  });

  return () => subscription.remove();
}

export async function checkNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || !NotificationModule?.isNotificationPermissionGranted) {
    return false;
  }

  try {
    return await NotificationModule.isNotificationPermissionGranted();
  } catch {
    return false;
  }
}

export function requestNotificationPermission(): void {
  if (Platform.OS === 'android') {
    NotificationModule?.requestNotificationPermission?.();
  }
}
