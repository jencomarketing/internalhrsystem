
import { createClient } from '@supabase/supabase-js';

// TODO: REPLACE THESE WITH YOUR SUPABASE PROJECT CREDENTIALS
// Go to Supabase Dashboard -> Project Settings -> API
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
