// Global rate limiting variables
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

// Function to truncate text to approximately 400 words
const truncateTo400Words = (text: string): string => {
  const words = text.split(/\s+/);
  if (words.length <= 400) return text;
  return words.slice(0, 400).join(' ') + '...';
};

// Function to enforce global rate limiting
const waitForRateLimit = async (): Promise<void> => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const delay = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`Global rate limit: Waiting ${Math.round(delay/1000)}ms before next request`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  lastRequestTime = Date.now();
};

// Updated function to call the proxy server with provider selection
export const callOpenAI = async (messages: any[], provider: string = 'openrouter'): Promise<string> => {
  // Wait for global rate limiting
  await waitForRateLimit();

  try {
    // Call our proxy server instead of the OpenAI API directly
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages,
        provider: provider // Pass the provider to the server
      }),
    });

    if (!response.ok) {
      // Get error message from response - clone to read safely
      let errorMessage = `Server error: ${response.status}`;
      const clonedResponse = response.clone();
      
      try {
        // Try to parse as JSON first
        const errorData = await clonedResponse.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If JSON parsing fails, try text from original response
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch {
          // If both fail, use status code
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
      }

      if (response.status === 429) {
        // Try to get the retry-after header or error message
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          const seconds = parseInt(retryAfter);
          throw new Error(`Rate limit exceeded. Please wait ${seconds} second(s) before trying again.`);
        }
        throw new Error(errorMessage || "Rate limit exceeded. Please wait a moment before sending another message.");
      }
      if (response.status === 402) {
        throw new Error(errorMessage || "Payment required. Please add credits to your account.");
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`Received response from ${provider}:`, JSON.stringify(data, null, 2));
    
    // Handle different response formats
    let content = '';
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const message = data.choices[0].message;
      
      // Standard OpenAI format
      if (message.content) {
        content = message.content;
        console.log(`Found content in standard format:`, content);
      } 
      // Special case for GPT-5 Nano - content might be in reasoning field
      else if (message.reasoning && typeof message.reasoning === 'string') {
        content = message.reasoning;
        console.log(`Found content in reasoning field (GPT-5 Nano special case):`, content);
      }
      // Another possible format for reasoning
      else if (message.reasoning && Array.isArray(message.reasoning_details)) {
        // Look for the summary in reasoning_details
        const summaryDetail = message.reasoning_details.find((detail: any) => detail.type === 'reasoning.summary');
        if (summaryDetail && summaryDetail.summary) {
          content = summaryDetail.summary;
          console.log(`Found content in reasoning_details summary (GPT-5 Nano special case):`, content);
        }
      }
    } else if (data.choices && data.choices[0] && data.choices[0].delta) {
      // Streaming format (unlikely in this case)
      content = data.choices[0].delta.content;
      console.log(`Found content in streaming format:`, content);
    } else if (data.result) {
      // Some other format
      content = data.result;
      console.log(`Found content in result format:`, content);
    } else {
      // Try to find content in other possible locations
      console.log(`Searching for content in alternative locations...`);
      
      // Check if there's a text field
      if (data.text) {
        content = data.text;
        console.log(`Found content in text field:`, content);
      }
      
      // Check if choices[0] has other content fields
      if (data.choices && data.choices[0]) {
        const choice = data.choices[0];
        console.log(`Choice structure:`, JSON.stringify(choice, null, 2));
        
        // Look for any field that might contain the response
        for (const key in choice) {
          if (typeof choice[key] === 'string' && choice[key].length > 0) {
            console.log(`Found potential content in choice.${key}:`, choice[key]);
          }
        }
      }
    }
    
    console.log(`Extracted content from ${provider}:`, content);
    
    if (content === undefined || content === null) {
      console.error(`No content found in response from ${provider}. Full response:`, data);
      throw new Error("Invalid response structure from AI service - no content found.");
    }
    
    // Convert to string if it's not already
    content = String(content);
    
    if (content.trim() === '') {
      console.error(`Empty content from ${provider}. Full response:`, data);
      throw new Error("Received empty response from AI service.");
    }
    
    // Truncate AI response to 400 words
    const aiMessage = truncateTo400Words(content);
    console.log(`Processed AI response from ${provider}:`, aiMessage);
    return aiMessage;

  } catch (error) {
    console.error(`Error calling ${provider} API:`, error);
    throw error;
  }
};
