import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://llxafpasowubzgxkswhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxseGFmcGFzb3d1YnpneGtzd2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDU0ODgsImV4cCI6MjA5NjQyMTQ4OH0.m1FTTrxGYPsBMBJV9c4HotPxYpCKxUtnZfz2D9MFEkM';

export const supabase = createClient(supabaseUrl, supabaseKey);
