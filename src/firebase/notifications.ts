'use client';

import { getToken, onMessage, Messaging, deleteToken } from 'firebase/messaging';
import { doc, setDoc, Firestore } from 'firebase/firestore';
import { Auth, User } from 'firebase/auth';

const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;

export async function requestNotificationPermission(
  messaging: Messaging,
  auth: Auth,
  firestore: Firestore
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (!VAPID_KEY) {
    console.error("[FCM] Variável de ambiente NEXT_PUBLIC_FCM_VAPID_KEY não configurada.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        return await saveMessagingDeviceToken(messaging, auth, firestore);
      }
    }
  } catch (error) {
    console.error("[FCM] Erro ao solicitar permissão:", error);
  }
  return false;
}

export async function disableNotifications(
  messaging: Messaging,
  auth: Auth,
  firestore: Firestore
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !messaging) return;

  try {
    await deleteToken(messaging);
    const uid = user.uid;
    const userProfileRef = doc(firestore, 'users', uid, 'profile', uid);
    await setDoc(userProfileRef, { fcmToken: null }, { merge: true });
  } catch (err) {
    console.error("[FCM] Erro ao desativar notificações:", err);
  }
}

export function setupForegroundMessageListener(messaging: Messaging): (() => void) | null {
  if (typeof window === 'undefined' || !messaging) return null;

  const unsubscribe = onMessage(messaging, (payload) => {
    try {
      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'Time', {
          body: payload.notification?.body,
          icon: '/icon-192x192.png',
          tag: payload.data?.taskId || 'foreground-update',
          renotify: false
        } as any);
      }
    } catch (error) {
      console.error("[FCM] Erro ao exibir notificação em primeiro plano:", error);
    }
  });

  return unsubscribe;
}

export function setupPWAInstallListener(messaging: Messaging, auth: Auth, firestore: Firestore) {
  if (typeof window === 'undefined') return;

  window.addEventListener('appinstalled', async () => {
    try {
      console.log('[PWA] Aplicativo instalado.');
      const user = auth.currentUser;
      if (user && messaging) {
        await saveMessagingDeviceToken(messaging, auth, firestore);
      }
    } catch (error) {
      console.error("[PWA] Erro ao processar evento appinstalled:", error);
    }
  });
}

async function saveMessagingDeviceToken(
  messaging: Messaging,
  auth: Auth,
  firestore: Firestore
): Promise<boolean> {
  const user: User | null = auth.currentUser;
  if (typeof window === 'undefined' || !messaging || !user) return false;

  if (!VAPID_KEY) {
    console.error("[FCM] Variável de ambiente NEXT_PUBLIC_FCM_VAPID_KEY não configurada.");
    return false;
  }

  try {
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    if (currentToken) {
      const uid = user.uid;
      const userProfileRef = doc(firestore, 'users', uid, 'profile', uid);
      await setDoc(userProfileRef, { fcmToken: currentToken }, { merge: true });
      return true;
    }
    console.error("[FCM] Nenhum token FCM foi retornado pelo navegador.");
    return false;
  } catch (err) {
    console.error("[FCM] Erro ao salvar token no perfil:", err);
    return false;
  }
}
