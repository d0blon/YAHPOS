import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.SII_ENCRYPTION_KEY = 'test-key-32-chars-long-1234567890';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
