import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Loader2, AlertCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { saveMessage, subscribeToMessages, loadMessages, supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaymentDialog } from "@/components/PaymentDialog";

interface Message {
  id: string;
  role: "user" | "assistant";
  message: string;
  timestamp: any; // Firebase Timestamp
}

interface ChatInterfaceProps {
  tileId: string;
  onBack: () => void;
}

interface LoadMessagesResult {
  data: any[] | null;
  error: any;
}

interface UserEntitlements {
  userId: string;
  plan: string;
  tokenUsage: number;
  tokenLimit: number;
  expiresAt: Date | null;
}

const tileColors = {
  "1": "hsl(var(--tile-1))",
  "2": "hsl(var(--tile-2))",
  "3": "hsl(var(--tile-3))",
  "4": "hsl(var(--tile-4))",
};

const truncateMessage = (message: string, maxLength: number = 400) => {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + "...";
};

const ChatInterface = ({ tileId, onBack }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const [rateLimitWarning, setRateLimitWarning] = useState<boolean>(false);
  const [apiRateLimitActive, setApiRateLimitActive] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [provider, setProvider] = useState<string>("openrouter"); // Default to OpenRouter
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [userId] = useState(`user_${tileId}_${Date.now()}`); // Unique user ID for this session
  const [userEntitlements, setUserEntitlements] = useState<UserEntitlements | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize session ID when component mounts
  useEffect(() => {
    // Generate a session ID per tile per day
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Always create a new session when component mounts
    const newSessionId = `session_${tileId}_${today}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(`chatSession_${tileId}_${today}`, newSessionId);
    setSessionId(newSessionId);
  }, [tileId]);

  // Fetch user entitlements
  useEffect(() => {
    const fetchUserEntitlements = async () => {
      try {
        const response = await fetch(`/api/user/${userId}/entitlements`);
        if (response.ok) {
          const entitlements = await response.json();
          setUserEntitlements(entitlements);
        }
      } catch (err) {
        console.error("Failed to fetch user entitlements:", err);
      }
    };
    
    fetchUserEntitlements();
  }, [userId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    // Don't proceed if sessionId is not yet set
    if (!sessionId) return;

    // Clear messages for new session (since we're always creating a new session)
    setMessages([]);

    // If Supabase isn't configured, skip subscriptions and run in local-only mode
    if (!supabase) {
      return;
    }

    // Subscribe to realtime updates
    unsubscribeRef.current = subscribeToMessages(tileId, sessionId, (newMessages) => {
      // Truncate all messages to 400 words
      const processedMessages = newMessages.map(msg => ({
        ...msg,
        message: truncateMessage(msg.message, 400),
        // Convert Firebase Timestamp to string
        timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate().toISOString() : new Date().toISOString()
      })) as Message[];
      
      setMessages(processedMessages);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [tileId, sessionId, lastMessageTime]);

  const retryLoadMessages = () => {
    setError(null);
    if (!supabase) {
      // No-op when Supabase is not configured
      return;
    }
    loadMessages(tileId, sessionId)
      .then((result: LoadMessagesResult) => {
        if (result.error) {
          console.error("Error loading messages:", result.error);
          setError("Failed to load chat history. Please check your Supabase configuration.");
          toast({
            title: "Error",
            description: "Failed to load chat history. Please check your Supabase configuration.",
            variant: "destructive",
          });
        }
      })
      .catch((error) => {
        console.error("Error loading messages:", error);
        setError("Failed to load chat history. Please check your Supabase configuration.");
        toast({
          title: "Error",
          description: "Failed to load chat history. Please check your Supabase configuration.",
          variant: "destructive",
        });
      });
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Implement client-side rate limiting (1 second between messages)
    const now = Date.now();
    if (now - lastMessageTime < 1000) {
      const remainingTime = Math.ceil((1000 - (now - lastMessageTime)) / 1000);
      setError(`Please wait ${remainingTime} second(s) before sending another message (rate limiting).`);
      setRateLimitWarning(true);
      setTimeout(() => setRateLimitWarning(false), 3000);
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    setIsTyping(true);
    setError(null);
    setLastMessageTime(now);
    setRateLimitWarning(false);

    try {
      // Save user message to Supabase if configured
      let id: string | null = null;
      if (supabase) {
        const result = await saveMessage(tileId, sessionId, "user", userMessage);
        id = result.id;
        if (result.error) throw result.error;
      }

      // Save user message locally first for immediate feedback
      const tempUserMessage: Message = {
        id: `temp_${Date.now()}`,
        role: "user",
        message: userMessage,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, tempUserMessage]);

      // Get conversation history for this tile/session
      let history: any[] = [];
      if (supabase) {
        const result = await loadMessages(tileId, sessionId);
        const res = result as LoadMessagesResult;
        history = res.data || [];
        if (res.error) {
          throw res.error;
        }
      } else {
        // Fallback to local state when Supabase is not configured
        history = messages.map((m) => ({ role: m.role, message: m.message }));
      }
      
      // Build conversation context
      // Customize system prompt based on provider
      let systemPrompt = `You are a helpful AI assistant for Chat ${tileId}. Keep responses concise (max 400 words).`;
      
      // For GPT-5 Nano, enforce English-only responses
      if (provider === "gpt5-nano") {
        systemPrompt += " Respond in English only.";
      } else {
        // For other providers (OpenRouter), allow Hinglish and local dialects
        systemPrompt += " You can respond in Hinglish and local dialects when appropriate.";
      }
      
      const conversationMessages = [
        {
          role: "system",
          content: systemPrompt
        },
        ...(history || []).map((h: any) => ({ role: h.role, content: h.message })),
        { role: "user", content: userMessage }
      ];

      // Call real OpenAI API through our proxy with selected provider and user ID
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversationMessages,
          provider: provider,
          userId: userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 402 && errorData.paymentRequired) {
          // User has exceeded token limit, show payment dialog
          setShowPaymentDialog(true);
          // Remove temporary message
          setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
          return;
        }
        
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract the AI response
      const aiResponse = data.choices[0].message.content;
      
      // Update user entitlements with new token info
      if (data.tokenInfo) {
        setUserEntitlements(prev => ({
          ...prev,
          tokenUsage: data.tokenInfo.totalUsage,
          tokenLimit: data.tokenInfo.limit
        }));
      }
      
      // Save AI response to Supabase if configured
      let aiId: string | null = null;
      if (supabase) {
        const { id: savedId, error: aiSaveError } = await saveMessage(tileId, sessionId, "assistant", aiResponse);
        aiId = savedId;
        if (aiSaveError) {
          toast({
            title: "Warning",
            description: "Failed to save AI message to history",
            variant: "destructive",
          });
        }
      }

      // Instead of just removing the temporary message, let's add the actual response to the local state
      // This ensures the response is immediately visible even if the subscription is slow
      const aiMessage: Message = {
        id: aiId || `ai_${Date.now()}`,
        role: "assistant",
        message: aiResponse,
        timestamp: new Date().toISOString(),
      };
      
      console.log('Adding AI message to local state:', aiMessage);
      
      // Update local state with the actual AI response
      setMessages(prev => {
        // Remove the temporary message and add the actual AI response
        const filtered = prev.filter(msg => msg.id !== tempUserMessage.id);
        return [...filtered, aiMessage];
      });
      
    } catch (error: any) {
      console.error("Error sending message:", error);
      // Handle rate limiting error specifically
      if (error.message && error.message.includes("Rate limit exceeded")) {
        setApiRateLimitActive(true);
        setTimeout(() => setApiRateLimitActive(false), 120000); // Show for 2 minutes
        setError("API rate limit reached. Please wait a few minutes before sending another message.");
        toast({
          title: "Rate Limit Exceeded",
          description: "Please wait a few minutes before sending another message.",
          variant: "destructive",
        });
      } else if (error.message && error.message.includes("API key")) {
        setError("API key is not configured properly. Please check your configuration.");
        toast({
          title: "Configuration Error",
          description: "API key is not configured properly.",
          variant: "destructive",
        });
      } else if (error.message && error.message.includes("authentication failed")) {
        setError("API authentication failed. Please check your API key validity.");
        toast({
          title: "Authentication Error",
          description: "API authentication failed. Please verify your API key is valid and active.",
          variant: "destructive",
        });
      } else if (error.message && error.message.includes("Payment required")) {
        // Show payment dialog
        setShowPaymentDialog(true);
      } else if (error.message && error.message.includes("User not found")) {
        setError("API authentication failed. The API key appears to be invalid or revoked. Please check your API key.");
        toast({
          title: "Authentication Error",
          description: "API authentication failed. The API key appears to be invalid or revoked. Please check your API key.",
          variant: "destructive",
        });
      } else {
        setError(error.message || "Failed to send message. Please try again.");
        toast({
          title: "Error",
          description: error.message || "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
      
      // Remove temporary message on error
      setMessages(prev => prev.filter(msg => !(typeof msg.id === 'string' && msg.id.startsWith('temp_'))));
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Only send if not in rate limit warning state
      if (!rateLimitWarning) {
        sendMessage();
      }
    }
  };

  // Add function to start a new session
  const startNewSession = () => {
    // Force a remount by changing the key
    window.location.reload();
  };

  const retrySendMessage = async () => {
    if (input.trim() && !isLoading) {
      // Clear any rate limit warning before retrying
      setRateLimitWarning(false);
      await sendMessage();
    }
  };

  // Provider display names - removed OpenAI GPT-4o Mini
  const providerNames: Record<string, string> = {
    openrouter: "OpenRouter",
    "gpt5-nano": "OpenAI GPT-5 Nano"
  };

  // Handle successful payment
  const handlePaymentSuccess = (plan: string) => {
    // Refresh user entitlements
    const fetchUserEntitlements = async () => {
      try {
        const response = await fetch(`/api/user/${userId}/entitlements`);
        if (response.ok) {
          const entitlements = await response.json();
          setUserEntitlements(entitlements);
        }
      } catch (err) {
        console.error("Failed to fetch user entitlements:", err);
      }
    };
    
    fetchUserEntitlements();
    
    // Show success message
    toast({
      title: "Payment Successful",
      description: `You've successfully upgraded your plan. Enjoy your additional tokens!`,
    });
    
    // Close payment dialog
    setShowPaymentDialog(false);
  };

  // Calculate remaining tokens
  const remainingTokens = userEntitlements 
    ? userEntitlements.tokenLimit - userEntitlements.tokenUsage 
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header 
        className="sticky top-0 z-10 backdrop-blur-lg border-b"
        style={{ backgroundColor: `${tileColors[tileId as keyof typeof tileColors]}/10` }}
      >
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="hover:scale-110 transition-transform">
            <ArrowLeft />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar style={{ backgroundColor: tileColors[tileId as keyof typeof tileColors] }}>
              <AvatarFallback className="text-white font-bold">C{tileId}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">Chat {tileId}</h1>
              <p className="text-sm text-muted-foreground">AI Assistant</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {userEntitlements && (
              <div className="text-sm bg-muted px-2 py-1 rounded">
                <span className="font-medium">
                  {remainingTokens > 0 ? remainingTokens.toLocaleString() : 0}
                </span>
                <span className="text-muted-foreground">/{userEntitlements.tokenLimit.toLocaleString()} tokens</span>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Settings size={16} />
                  <span>{providerNames[provider] || provider}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setProvider("openrouter")}>
                  {providerNames["openrouter"]}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setProvider("gpt5-nano")}>
                  {providerNames["gpt5-nano"]}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={startNewSession}
            >
              New Chat
            </Button>
          </div>
          {rateLimitWarning && (
            <div className="ml-2 bg-yellow-100 border border-yellow-400 text-yellow-700 px-2 py-1 rounded text-xs">
              Slow down to avoid rate limits
            </div>
          )}
          {apiRateLimitActive && (
            <div className="ml-2 bg-red-100 border border-red-400 text-red-700 px-2 py-1 rounded text-xs">
              API Rate Limit Active - Please wait
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl mx-auto px-4 py-6 space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="text-destructive" size={20} />
              <div className="flex-1">
                <p className="text-destructive font-medium">Error</p>
                <p className="text-destructive/80 text-sm">{error}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={retryLoadMessages}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Payment Dialog */}
          <PaymentDialog 
            open={showPaymentDialog}
            onOpenChange={setShowPaymentDialog}
            onPaymentSuccess={handlePaymentSuccess}
            userId={userId}
          />

          <AnimatePresence>
            {messages.length === 0 && !isTyping && !error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <p className="text-muted-foreground text-lg">Start a conversation...</p>
                <p className="text-muted-foreground text-sm mt-2">
                  Using {providerNames[provider] || provider}
                </p>
                {userEntitlements && (
                  <p className="text-muted-foreground text-sm mt-2">
                    {remainingTokens > 0 ? remainingTokens.toLocaleString() : 0} tokens remaining
                  </p>
                )}
              </motion.div>
            )}
            
            {messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar 
                  className="mt-1"
                  style={msg.role === "assistant" ? { backgroundColor: tileColors[tileId as keyof typeof tileColors] } : {}}
                >
                  <AvatarFallback className={msg.role === "assistant" ? "text-white font-bold" : ""}>
                    {msg.role === "user" ? "U" : `C${tileId}`}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 px-2">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <Avatar style={{ backgroundColor: tileColors[tileId as keyof typeof tileColors] }}>
                  <AvatarFallback className="text-white font-bold">C{tileId}</AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                      className="w-2 h-2 bg-foreground/40 rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                      className="w-2 h-2 bg-foreground/40 rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                      className="w-2 h-2 bg-foreground/40 rounded-full"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">AI is typing...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="sticky bottom-0 backdrop-blur-lg border-t bg-background/80">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message (${providerNames[provider] || provider})...`}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              style={{ backgroundColor: tileColors[tileId as keyof typeof tileColors] }}
              className="text-white hover:opacity-90"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChatInterface;