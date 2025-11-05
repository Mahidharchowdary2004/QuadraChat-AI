// Notification utilities with Firebase FCM integration
import { requestFirebaseNotificationPermission, onForegroundMessage } from "@/integrations/firebase/client";

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    // Initialize Firebase messaging for foreground messages
    onForegroundMessage();
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      try {
        // Request Firebase token for push notifications
        await requestFirebaseNotificationPermission();
        // Initialize Firebase messaging for foreground messages
        onForegroundMessage();
      } catch (error) {
        console.warn("Failed to initialize Firebase messaging:", error);
      }
    }
    return permission === "granted";
  }

  return false;
};

export const showNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options,
    });
  }
};

export const scheduleDailyReminder = () => {
  // Check if we should show the reminder (once per day)
  const lastReminder = localStorage.getItem("lastReminderDate");
  const today = new Date().toDateString();
  
  if (lastReminder !== today) {
    showNotification("Multi-Tile Chat", {
      body: "Hey! Continue your chat today 😊",
      tag: "daily-reminder",
    });
    localStorage.setItem("lastReminderDate", today);
  }
};

// Schedule daily reminder using setInterval
export const startDailyReminderScheduler = () => {
  // Run immediately on start
  scheduleDailyReminder();
  
  // Schedule to run every 24 hours
  setInterval(() => {
    scheduleDailyReminder();
  }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
};

// Check for reminder on app load
export const initNotifications = async () => {
  const hasPermission = await requestNotificationPermission();
  
  if (hasPermission) {
    // Check if 24 hours have passed since last visit
    const lastVisit = localStorage.getItem("lastVisit");
    const now = Date.now();
    
    if (lastVisit && now - parseInt(lastVisit) > 24 * 60 * 60 * 1000) {
      scheduleDailyReminder();
    }
    
    localStorage.setItem("lastVisit", now.toString());
    
    // Start the daily reminder scheduler
    startDailyReminderScheduler();
  }
};