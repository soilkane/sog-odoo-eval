import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://koajkvijrcxbusbhwuug.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvYWprdmlqcmN4YnVzYmh3dXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMDQ2MTYsImV4cCI6MjA5NjY4MDYxNn0.ZIwtU9HqaHJFPhNleigFUd0_0S9YH9-kjYk7ER4CQlI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
