import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initNotifications } from "@/utils/notifications";

const NotificationPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt
    const hasAsked = localStorage.getItem("notificationAsked");
    if (!hasAsked && "Notification" in window && Notification.permission === "default") {
      // Show prompt after 2 seconds
      const timer = setTimeout(() => setShowPrompt(true), 2000);
      return () => clearTimeout(timer);
    }
    
    // Initialize notifications if already granted
    if (Notification.permission === "granted") {
      initNotifications();
    }
  }, []);

  const handleAllow = async () => {
    try {
      await initNotifications();
      localStorage.setItem("notificationAsked", "true");
      setShowPrompt(false);
    } catch (error) {
      console.error("Failed to initialize notifications:", error);
      // Still mark as asked to avoid infinite prompts
      localStorage.setItem("notificationAsked", "true");
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("notificationAsked", "true");
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 z-50 max-w-sm"
        >
          <div className="bg-card border rounded-xl shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bell className="text-primary" size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Stay Updated</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Enable notifications to get daily reminders to continue your chats!
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAllow}>
                    Allow
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDismiss}>
                    Not now
                  </Button>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={handleDismiss}
              >
                <X size={16} />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPrompt;