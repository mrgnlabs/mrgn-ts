import { Wallet } from "@mrgnlabs/mrgn-common"

import { AuthUser, SignupPayload, LoginPayload } from '../types/auth.types'
import { generateSignMessage } from '../utils/auth-crypto.utils'
import { createBrowserSupabaseClient } from '../auth-client'

export async function loginOrSignup(
    wallet: Wallet,
    walletId?: string,
    referralCode?: string
  ): Promise<{ user: AuthUser | null; error: any }> {
    const walletAddress = wallet.publicKey?.toBase58()
    if (!walletAddress) {
      throw new Error('Wallet not connected')
    }
  
    // Check if user exists first
    const user = await getUser(walletAddress)
    
    if (!user && wallet.signMessage) {
      // Only get signature for new users
      const signMessage = await generateSignMessage(walletAddress)
      const signature = await wallet.signMessage(
        new TextEncoder().encode(JSON.stringify(signMessage))
      )
  
      return signup({
        walletAddress,
        signature: Buffer.from(signature).toString('base64'),
        signedMessage: signMessage,
        walletId,
        referralCode
      })
    } else {
      return login({ walletAddress, walletId })
    }
  }
  
  export async function login(payload: LoginPayload) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
  
      const data = await response.json()
  
      // Use Supabase's built-in session management
      const supabase = createBrowserSupabaseClient()
      if (data.token) {
        await supabase.auth.setSession({
          access_token: data.token,
          refresh_token: data.token // Supabase handles refresh
        })
      }
  
      return data
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Login failed'
      }
    }
  }
  
  export async function signup(payload: SignupPayload) {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
  
      const data = await response.json()
  
      if (data.token) {
        const supabase = createBrowserSupabaseClient()
        await supabase.auth.setSession({
          access_token: data.token,
          refresh_token: data.token
        })
      }
  
      return data
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Signup failed'
      }
    }
  }

  export async function getUser(walletAddress: string) {
    const supabase = createBrowserSupabaseClient()
    const { data } = await supabase
      .from('users')
      .select()
      .eq('wallet_address', walletAddress)
      .single()
    
    return data
  }

  export async function logout(): Promise<void> {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
  }