import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
import { identifyUser } from '@/lib/analytics'

export function useAuth() {
  const navigate = useNavigate()
  const { user, profile, company, setUser, setProfile, setCompany, setLoading, clear } =
    useAuthStore()

  useEffect(() => {
    // Check if we're in demo mode or dev mode
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
    const isDemoMode = supabaseUrl.includes('placeholder')
    const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
    
    if (isDemoMode || isDevMode) {
      // In demo/dev mode, create a mock authenticated state
      // Use valid UUIDs for dev mode to work with database constraints
      const mockUserId = '00000000-0000-0000-0000-000000000123'
      const mockCompanyId = '00000000-0000-0000-0000-000000000456'
      
      const mockUser = {
        id: mockUserId,
        email: 'dev@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as any

      const mockProfile = {
        id: mockUserId,
        company_id: mockCompanyId,
        role: 'admin' as const,
        email: 'dev@example.com',
        full_name: 'Dev User',
        avatar_url: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const mockCompany = {
        id: mockCompanyId,
        name: 'Dev Company',
        slug: 'dev-company',
        logo_url: undefined,
        stripe_id: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setUser(mockUser)
      setProfile(mockProfile)
      setCompany(mockCompany)
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserData(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserData(session.user.id)
      } else {
        clear()
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserData = async (userId: string) => {
    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError

      setProfile(profileData)

      // Load company
      if (profileData.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profileData.company_id)
          .single()

        if (companyError) throw companyError

        setCompany(companyData)

        // Track user
        identifyUser(userId, {
          email: profileData.email,
          role: profileData.role,
          company: companyData.name,
        })
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    clear()
    navigate('/auth/login')
  }

  return {
    user,
    profile,
    company,
    isLoading: useAuthStore((state) => state.isLoading),
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
  }
}

