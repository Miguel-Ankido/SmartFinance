import {
  checkNotificationPermission,
  requestNotificationPermission,
} from './notificationListener';

export const notificationBridge = {
  checkPermission: checkNotificationPermission,
  openSettings: requestNotificationPermission,
};
