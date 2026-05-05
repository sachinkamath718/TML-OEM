import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://your-project-id.supabase.co';   // 👈 replace this
const SUPABASE_ANON_KEY = 'your-anon-key-here';               // 👈 replace this

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
