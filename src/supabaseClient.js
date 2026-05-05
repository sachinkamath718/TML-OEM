import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dfewivwmtnmwuikkjdor.supabase.co';   // 👈 replace this
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZXdpdndtdG5td3Vpa2tqZG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjEzOTksImV4cCI6MjA5MzUzNzM5OX0.hWyDq2KhqSEwRZlH52e4d0UmbjtYPe5X0JQoGhvSs4E';               // 👈 replace this

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
