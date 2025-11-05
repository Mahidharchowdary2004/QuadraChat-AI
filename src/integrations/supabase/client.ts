import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';

// Debug logging
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey);
console.log('Supabase Key length:', supabaseKey.length);
console.log('Supabase Key type:', typeof supabaseKey);

// Validate configuration
if (!supabaseUrl) {
  console.error('Supabase URL is missing. Please check your .env file.');
}

if (!supabaseKey) {
  console.error('Supabase Key is missing. Please check your .env file.');
}

// Only create Supabase client if we have both URL and Key
let supabase;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client created successfully');
    
    // Test the connection
    setTimeout(testSupabaseConnection, 1000); // Delay to ensure client is fully initialized
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    supabase = null;
  }
} else {
  console.error('Supabase client not created due to missing or invalid configuration');
  supabase = null;
}

export { supabase };

// Test Supabase connection and check if chats table exists
async function testSupabaseConnection() {
  if (!supabase) {
    console.error('Cannot test connection: Supabase client not initialized');
    return;
  }
  
  try {
    console.log('Testing Supabase connection...');
    
    // Test 1: Try to query the chats table directly
    const { data, error } = await supabase
      .from('chats')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('Error querying chats table:', error);
      // Check if it's a table existence error
      if (error.message.includes('relation "chats" does not exist') || 
          error.message.includes('not found') ||
          error.message.includes('does not exist')) {
        console.error('CRITICAL: The "chats" table does not exist in your Supabase database.');
        console.error('Please create the "chats" table with the required schema:');
        console.error('CREATE TABLE chats (');
        console.error('  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,');
        console.error('  tile_id TEXT NOT NULL,');
        console.error('  session_id TEXT NOT NULL,');
        console.error('  role TEXT NOT NULL,');
        console.error('  message TEXT NOT NULL,');
        console.error('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
        console.error(');');
      }
      return;
    }
    
    console.log('Successfully queried chats table. Table is accessible.');
    console.log('Connection test passed. Supabase is properly configured.');
  } catch (error) {
    console.error('Unexpected error during Supabase connection test:', error);
  }
}

// Chat message functions
export const saveMessage = async (tileId: string, sessionId: string, role: string, message: string) => {
  if (!supabase) {
    return { id: null, error: new Error('Supabase client not initialized') };
  }
  
  try {
    console.log('Saving message:', { tileId, sessionId, role, messageLength: message.length });
    
    const { data, error } = await supabase
      .from('chats')
      .insert([
        {
          tile_id: tileId,
          session_id: sessionId,
          role: role,
          message: message,
          created_at: new Date(),
        }
      ])
      .select();

    if (error) throw error;
    
    console.log('Message saved successfully:', data?.[0]?.id);
    return { id: data?.[0]?.id, error: null };
  } catch (error: any) {
    console.error('Error saving message:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      hint: error.hint,
      details: error.details
    });
    return { id: null, error: error };
  }
};

export const subscribeToMessages = (tileId: string, sessionId: string, callback: (messages: any[]) => void) => {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return () => {}; // Return empty unsubscribe function
  }
  
  // Subscribe to real-time updates
  const channel = supabase
    .channel(`chat:${tileId}:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chats',
        filter: `tile_id=eq.${tileId},session_id=eq.${sessionId}`
      },
      (payload) => {
        const newMessage = payload.new;
        // Fetch all messages for this tile/session to maintain order
        loadMessages(tileId, sessionId).then((result) => {
          if (!result.error) {
            callback(result.data || []);
          }
        });
      }
    )
    .subscribe((status) => {
      console.log('Realtime subscription status:', status);
      // Handle connection issues
      if (status === 'CLOSED') {
        console.warn('Realtime subscription closed. This may be due to network issues.');
      }
    });

  // Initial load
  loadMessages(tileId, sessionId).then((result) => {
    if (result.error) {
      console.error('Error in initial loadMessages:', result.error);
      console.error('Error details:', {
        message: result.error.message,
        code: result.error.code,
        hint: result.error.hint,
        details: result.error.details
      });
    }
    if (!result.error) {
      callback(result.data || []);
    }
  });

  // Return unsubscribe function
  return () => {
    if (supabase) {
      supabase.removeChannel(channel);
    }
  };
};

export const loadMessages = async (tileId: string, sessionId: string) => {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }
  
  try {
    console.log('Attempting to load messages for tileId:', tileId, 'sessionId:', sessionId);
    
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('tile_id', tileId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
    
    console.log('Successfully loaded messages:', data?.length || 0);
    return { data: data || [], error: null };
  } catch (error: any) {
    console.error('Error loading messages:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      hint: error.hint,
      details: error.details
    });
    return { data: null, error: error };
  }
};