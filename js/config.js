// ============================================================
// CampusWallet — Supabase Configuration
// ============================================================
// Replace these values with your Supabase project credentials.
// Get them from: https://supabase.com → Your Project → Settings → API

const SUPABASE_URL  = 'https://qvxhmwmlvvubwmhgjbij.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2eGhtd21sdnZ1YndtaGdqYmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1ODgxNjMsImV4cCI6MjEwNjE2NDE2M30.Y_GBB3qbF7LTJC6Ft-L6ZAzmcR0gXoIMEJ4FMT4d_b0';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
