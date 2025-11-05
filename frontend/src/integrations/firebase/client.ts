import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { firebaseConfig } from "./config";

// Initialize Firebase only if required config exists
const hasFirebaseConfig = Boolean(
  firebaseConfig?.apiKey &&
  firebaseConfig?.authDomain &&
  firebaseConfig?.projectId &&
  firebaseConfig?.messagingSenderId &&
  firebaseConfig?.appId
) && firebaseConfig.apiKey !== "your_firebase_api_key";

let app: any = null;
let messaging: any = null;

try {
  if (hasFirebaseConfig) {
    app = initializeApp(firebaseConfig);
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.warn("Firebase Messaging not supported in this environment:", error);
    }
  } else {
    console.info("Firebase config missing; skipping Firebase initialization.");
  }
} catch (error) {
  console.warn("Failed to initialize Firebase:", error);
}

export { app, messaging };

// Request permission to receive notifications
export const requestFirebaseNotificationPermission = async () => {
  if (!messaging) {
    throw new Error("Firebase Messaging is not configured");
  }

  try {
    const currentToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    
    if (currentToken) {
      console.log("Firebase token:", currentToken);
      return currentToken;
    } else {
      throw new Error("No registration token available");
    }
  } catch (error) {
    console.error("Error getting Firebase token:", error);
    throw error;
  }
};

// Handle foreground messages
export const onForegroundMessage = () => {
  if (!messaging) return;
  
  onMessage(messaging, (payload) => {
    console.log("Message received in foreground:", payload);
    // Customize notification handling here
    const notificationTitle = payload.notification?.title || "New Message";
    const notificationOptions = {
      body: payload.notification?.body || "You have a new message",
      icon: payload.notification?.icon || "/favicon.ico",
    };

    // Show browser notification if permission is granted
    if (Notification.permission === "granted") {
      new Notification(notificationTitle, notificationOptions);
    }
  });
};

