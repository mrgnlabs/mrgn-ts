import { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '~/auth/auth-server'
import { generateToken } from '~/auth/utils/auth-jwt.utils'
import { LoginPayload } from '~/auth/types/auth.types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { walletAddress, walletId }: LoginPayload = req.body
    const supabase = createServerSupabaseClient()

    // Find user by wallet address
    const { data: user, error: userError } = await supabase
      .from('users')
      .select()
      .eq('wallet_address', walletAddress)
      .single()

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update last login and wallet ID if changed
    const { error: updateError } = await supabase
      .from('users')
      .update({
        last_login: new Date().toISOString(),
        wallet_id: walletId || user.wallet_id
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update user:', updateError)
    }

    // Generate JWT token
    const token = generateToken(walletAddress)

    return res.status(200).json({
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        walletId: walletId || user.wallet_id,
        referralCode: user.referral_code,
        referredBy: user.referred_by,
        lastLogin: user.last_login
      },
      token
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
}