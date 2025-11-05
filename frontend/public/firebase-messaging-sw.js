// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.10.0/firebase-messaging-compat.js');

// Firebase configuration - using default values
// In a production environment, these would be set by the main application
const firebaseConfig = {
  apiKey: "your_firebase_api_key",
  authDomain: "your_firebase_auth_domain",
  projectId: "your_firebase_project_id",
  storageBucket: "your_firebase_storage_bucket",
  messagingSenderId: "your_firebase_messaging_sender_id",
  appId: "your_firebase_app_id",
  measurementId: "your_firebase_measurement_id",
};

// Only initialize Firebase if we have a valid config
let initialized = false;
try {
  // Check if we have valid config values
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "your_firebase_api_key") {
    firebase.initializeApp(firebaseConfig);
    initialized = true;
  } else {
    console.log('Firebase not initialized - missing configuration');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

if (initialized) {
  const messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);
    
    const notificationTitle = payload.notification?.title || 'Multi-Tile Chat';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new message',
      icon: payload.notification?.icon || '/favicon.ico',
      badge: '/favicon.ico',
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.log('Firebase Messaging not available - Firebase not initialized');
}