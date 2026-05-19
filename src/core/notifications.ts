import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp, getApp } from 'firebase/app';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { toast } from '../utils/helpers';

const VAPID_KEY_STORAGE = 'bvg_fcm_token';
const NOTIFY_ENABLED_KEY = 'bvg_notifications_enabled';

let messaging: ReturnType<typeof getMessaging> | null = null;

function getMessagingInstance() {
  if (!messaging) {
    try {
      messaging = getMessaging(getApp());
    } catch (e) {
      console.error('FCM: Failed to init messaging', e);
    }
  }
  return messaging;
}

const Notifications = {
  async init(): Promise<void> {
    const msg = getMessagingInstance();
    if (!msg) return;

    onMessage(msg, (payload) => {
      const title = payload.notification?.title || 'Слово Живе';
      const body = payload.notification?.body || '';
      toast(`${title}: ${body}`);
    });
  },

  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  },

  isEnabled(): boolean {
    return localStorage.getItem(NOTIFY_ENABLED_KEY) === '1';
  },

  getPermissionState(): string {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  async subscribe(): Promise<boolean> {
    if (!this.isSupported()) {
      toast('Ваш браузер не підтримує сповіщення');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast('Сповіщення заблоковані в налаштуваннях браузера');
        return false;
      }

      const msg = getMessagingInstance();
      if (!msg) return false;

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      const token = await getToken(msg, {
        vapidKey: '',
        serviceWorkerRegistration: registration,
      });

      if (!token) {
        toast('Не вдалося отримати токен');
        return false;
      }

      localStorage.setItem(VAPID_KEY_STORAGE, token);
      localStorage.setItem(NOTIFY_ENABLED_KEY, '1');

      if (auth.currentUser) {
        await setDoc(doc(db, `users/${auth.currentUser.uid}/metadata`, 'fcm'), {
          token,
          enabled: true,
          updatedAt: Date.now(),
          platform: navigator.userAgent,
        });
      }

      toast('Сповіщення увімкнено!');
      return true;
    } catch (e) {
      console.error('FCM: Subscribe error', e);
      toast('Помилка при підключенні сповіщень');
      return false;
    }
  },

  async unsubscribe(): Promise<void> {
    localStorage.removeItem(VAPID_KEY_STORAGE);
    localStorage.setItem(NOTIFY_ENABLED_KEY, '0');

    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, `users/${auth.currentUser.uid}/metadata`, 'fcm'));
      } catch (e) {
        console.error('FCM: Unsubscribe error', e);
      }
    }

    toast('Сповіщення вимкнено');
  },

  async toggle(): Promise<boolean> {
    if (this.isEnabled()) {
      await this.unsubscribe();
      return false;
    } else {
      return await this.subscribe();
    }
  }
};

export default Notifications;
