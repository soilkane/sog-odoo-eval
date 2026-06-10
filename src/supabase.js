import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://slcmshufvgbweywzqyqh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsY21zaHVmdmdid2V5d3pxeXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMDQ2MDksImV4cCI6MjA5NjY4MDYwOX0._3LKCyK-E7NPobMb7umnt4h25id1cCjnGb04cii-4SU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
