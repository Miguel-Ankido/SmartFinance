import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://orqdnajsfwmlanxwmpce.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycWRuYWpzZndtbGFueHdtcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MzM4ODQsImV4cCI6MjEwNjIwOTg4NH0.Gs_MwdVWN9AK13A8vuMJS9GITZrtYRdi9RIHrf__ag4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});