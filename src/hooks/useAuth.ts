import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { Profile, UserRole, Company } from '@/types'
import { identifyUser } from '@/lib/analytics'

/**
 * Single source of truth for authentication state
 * 
 * Features:
 * - Real-time auth state listening
 * - Automatic profile fetching on login
 * - Automatic profile creation if missing (role = 'company')
 * - Bulletproof error handling (RLS errors don't hang)
 * - Exposes: user, profile, isAdmin, isLoading
 */
export function useAuth() {
  const navigate = useNavigate()
  const { user, profile, setUser, setProfile, setLoading, clear } = useAuthStore()
  const initializedRef = useRef(false)
  const loadingProfileRef = useRef<string | null>(null)
  const currentProfileRef = useRef<Profile | null>(null)
  const profileLoadStartedRef = useRef<Set<string>>(new Set())

  // Keep ref in sync with profile
  useEffect(() => {
    currentProfileRef.current = profile
  }, [profile])

  useEffect(() => {
    // Prevent multiple initializations (React strict mode causes double renders)
    if (initializedRef.current) {
      return
    }
    initializedRef.current = true

    let mounted = true

    // Helper function to load profile for a user
    const handleUserSession = async (sessionUser: User, event?: string) => {
      if (!mounted) return
      
      const userId = sessionUser.id
      const currentProfile = currentProfileRef.current
      
      // If profile already loaded for this user, just ensure loading is false
      if (currentProfile && currentProfile.id === userId) {
        setLoading(false)
        return
      }
      
      // If we're already loading this user's profile, skip
      if (loadingProfileRef.current === userId || profileLoadStartedRef.current.has(userId)) {
        return
      }
      
      // If another user's profile is being loaded, wait a bit
      if (loadingProfileRef.current && loadingProfileRef.current !== userId) {
        return
      }
      
      // Mark that we're starting to load this profile
      profileLoadStartedRef.current.add(userId)
      loadingProfileRef.current = userId
      
      try {
        // Add a small delay for INITIAL_SESSION to ensure session is fully ready
        // INITIAL_SESSION means the session is already initialized, so we just need a brief moment
        if (event === 'INITIAL_SESSION') {
          await new Promise(resolve => setTimeout(resolve, 100))
          if (!mounted) return
        }
        
        await loadOrCreateProfile(sessionUser)
      } finally {
        loadingProfileRef.current = null
        profileLoadStartedRef.current.delete(userId)
      }
    }

    // Listen for auth state changes in real time
    // onAuthStateChange fires immediately with current session, so we don't need getSession()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      // Reset tracking on auth changes
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        profileLoadStartedRef.current.clear()
      }

      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Only fetch profile on INITIAL_SESSION (session is fully ready)
        // Skip SIGNED_IN for profile loading - session might not be ready yet
        // This prevents timeouts and duplicate fetches
        if (event === 'SIGNED_IN') {
          // Just set the user, don't fetch profile yet
          // INITIAL_SESSION will fire next and handle the profile fetch
          return
        }
        
        // Skip INITIAL_SESSION if we already started loading (prevents duplicate fetches)
        if (event === 'INITIAL_SESSION' && profileLoadStartedRef.current.has(session.user.id)) {
          return
        }
        
        await handleUserSession(session.user, event)
      } else {
        clear()
        setLoading(false)
        loadingProfileRef.current = null
        currentProfileRef.current = null
        profileLoadStartedRef.current.clear()
      }
    })

    // Handle email confirmation hash/query params - clean after 2s
    const hash = window.location.hash
    const searchParams = new URLSearchParams(window.location.search)
    const hasVerification = hash.includes('access_token') || hash.includes('type=recovery') || searchParams.has('verified')

    if (hasVerification) {
      // Clean URL after 2 seconds
      setTimeout(() => {
        if (!mounted) return
        
        // Clean hash from URL
        if (hash) {
          window.history.replaceState({}, '', window.location.pathname + window.location.search)
        }
        
        // Clean verified query param
        if (searchParams.has('verified')) {
          searchParams.delete('verified')
          const newSearch = searchParams.toString()
          const newUrl = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname
          window.history.replaceState({}, '', newUrl)
        }
      }, 2000)
    }

    return () => {
      mounted = false
      initializedRef.current = false
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUser, setProfile, setLoading, clear])

  /**
   * Loads company data from the database.
   */
  const loadCompany = async (companyId: string) => {
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      if (error) {
        console.error('Error loading company:', error)
        return
      }

      if (company) {
        useAuthStore.getState().setCompany(company as Company)
      }
    } catch (error) {
      console.error('Unexpected error loading company:', error)
    }
  }

  /**
   * Loads the user's profile from the database.
   * If the profile doesn't exist, creates it automatically with role = 'company'.
   * Bulletproof error handling - RLS errors or other issues won't hang the app.
   */
  const loadOrCreateProfile = async (user: User) => {
    try {
      setLoading(true)

      // Fetch existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // Handle "not found" case (profile doesn't exist)
      if (fetchError && fetchError.code === 'PGRST116') {
        // Profile doesn't exist - create it below
      } else if (fetchError) {
        // Real error occurred
        console.error('Error fetching profile:', {
          code: fetchError.code,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
        })
        setProfile(null)
        setLoading(false)
        return
      } else if (existingProfile) {
        // Profile found - return it
        const profileWithEmail = {
          ...existingProfile,
          email: user.email || undefined,
        } as Profile
        
        setProfile(profileWithEmail)
        
        // Load company if profile has company_id
        if (existingProfile.company_id) {
          await loadCompany(existingProfile.company_id)
        }
        
        identifyUser(user.id, {
          email: user.email || '',
          role: existingProfile.role,
        })
        
        setLoading(false)
        return
      }
      
      // If we get here, profile doesn't exist (PGRST116) - create it
      // Create it automatically with default role 'company'
      // Note: company_name will be set during onboarding, so it's nullable here
      const newProfile = {
        id: user.id,
        role: 'company' as UserRole,
        company_name: null, // Will be set during onboarding
        phone: null, // Optional
      }

      // Insert new profile
      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single()

      if (createError) {
        console.error('Error creating profile:', createError)
        // Don't throw - set profile to null and stop loading
        setProfile(null)
        setLoading(false)
        return
      }

      // Add email from auth user to profile object (email is in auth.users, not profiles table)
      const profileWithEmail = {
        ...createdProfile,
        email: user.email || undefined,
      } as Profile
      
      setProfile(profileWithEmail)
      
      // Load company if profile has company_id
      if (createdProfile.company_id) {
        await loadCompany(createdProfile.company_id)
      }
      
      // Track new user
      identifyUser(user.id, {
        email: user.email || '',
        role: createdProfile.role,
      })
      
      setLoading(false)
    } catch (error: unknown) {
      // Catch any unexpected errors (network issues, etc.)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Unexpected error loading/creating profile:', errorMessage)
      
      // Set profile to null and stop loading - don't hang
      setProfile(null)
      setLoading(false)
    } finally {
      // Ensure loading is always set to false
      setLoading(false)
    }
  }

  // Sign out function
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
    clear()
    navigate('/auth/login')
  }

  // Computed values
  const isAuthenticated = !!user
  const isAdmin = profile?.role === 'admin'
  const isLoading = useAuthStore((state) => state.isLoading)
  const company = useAuthStore((state) => state.company)

  return {
    // Auth state
    user,
    profile,
    company,
    isLoading,
    isAuthenticated,
    isAdmin,
    // Actions
    signOut,
  }
}
