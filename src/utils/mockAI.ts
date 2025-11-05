// Mock AI response generator for development/testing
// This replaces the OpenAI API with simulated responses

// Function to truncate text to approximately 400 words
const truncateTo400Words = (text: string): string => {
  const words = text.split(/\s+/);
  if (words.length <= 400) return text;
  return words.slice(0, 400).join(' ') + '...';
};

// Mock responses based on common prompts
const getMockResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase();
  
  // Simple keyword-based responses
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hello there! I'm your AI assistant for this multi-tile chat application. How can I help you today?";
  }
  
  if (lowerMessage.includes('help')) {
    return "I can help you with various tasks in this chat application. You can ask me questions, request information, or just have a conversation. I'm designed to be helpful, harmless, and honest.";
  }
  
  if (lowerMessage.includes('tile') || lowerMessage.includes('chat')) {
    return "This is a multi-tile chat application where each tile represents an independent conversation. You can switch between tiles to manage different conversations simultaneously.";
  }
  
  if (lowerMessage.includes('thank')) {
    return "You're welcome! I'm glad I could help. Is there anything else you'd like to know?";
  }
  
  if (lowerMessage.includes('name')) {
    return "I'm your AI assistant for this chat application. You can call me ChatAI. I'm here to help with your conversations!";
  }
  
  if (lowerMessage.includes('time')) {
    return `The current time is ${new Date().toLocaleTimeString()}. How can I assist you further?`;
  }
  
  if (lowerMessage.includes('date')) {
    return `Today's date is ${new Date().toLocaleDateString()}. How can I assist you further?`;
  }
  
  if (lowerMessage.includes('weather')) {
    return "I don't have access to real-time weather data, but I can help you find weather information through other means if you'd like!";
  }
  
  if (lowerMessage.includes('joke')) {
    const jokes = [
      "Why don't scientists trust atoms? Because they make up everything!",
      "What did one ocean say to the other ocean? Nothing, they just waved!",
      "Why did the scarecrow win an award? Because he was outstanding in his field!",
      "What do you call a fake noodle? An impasta!"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  
  if (lowerMessage.includes('how are you')) {
    return "I'm doing well, thank you for asking! I'm here and ready to help with your chat application needs.";
  }
  
  if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
    return "Goodbye! Feel free to come back anytime you need assistance with your chats.";
  }
  
  // Default responses
  const defaultResponses = [
    "That's an interesting point. In a real implementation, I would provide a more detailed response based on your query.",
    "Thanks for sharing that with me. I'm designed to assist with various types of conversations in this multi-tile chat application.",
    "I understand what you're saying. This mock response simulates what a real AI might say in response to your message.",
    "That's a thoughtful message. In a production environment, I would analyze your input more deeply to provide a tailored response.",
    "I appreciate your input. This is a demonstration of how the chat system would work with a real AI service.",
    "Interesting perspective! This mock AI is designed to simulate responses while we develop the full application.",
    "I see what you mean. The multi-tile chat interface allows you to manage multiple conversations simultaneously.",
    "That's a great observation. Each tile in this application maintains its own independent chat history."
  ];
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
};

// Function to generate mock AI responses
export const callMockAI = async (messages: any[]): Promise<string> => {
  // Get the last user message
  const lastUserMessage = messages
    .filter(msg => msg.role === 'user')
    .pop()?.content || 'Hello';
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // Generate and return mock response
  const response = getMockResponse(lastUserMessage);
  return truncateTo400Words(response);
};