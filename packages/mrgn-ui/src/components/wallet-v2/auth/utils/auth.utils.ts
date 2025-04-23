import { Wallet } from "@mrgnlabs/mrgn-common";
import crypto from "crypto";

import { AuthUser, SignupPayload, AuthPayload, LoginPayload } from "../types/auth.types";
import { generateSignMessage, createSignatureMessage } from "../utils/auth-crypto.utils";
import { createBrowserSupabaseClient } from "../client";

export async function login(payload: AuthPayload | LoginPayload) {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include", // Include cookies in the request
    });

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Login failed", error);
    return {
      user: null,
      error: error instanceof Error ? error.message : "Login failed",
    };
  }
}

export async function signup(payload: SignupPayload) {
  try {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include", // Include cookies in the request
    });

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Signup failed", error);
    return {
      user: null,
      error: error instanceof Error ? error.message : "Signup failed",
    };
  }
}

async function signMessageForAuth(wallet: Wallet) {
  if (!wallet.signMessage) {
    throw new Error("Wallet does not support signMessage");
  }

  const signMessage = await generateSignMessage(wallet.publicKey?.toBase58() ?? "");
  const messageToSign = createSignatureMessage(wallet.publicKey?.toBase58() ?? "");
  const rawSignature = await wallet.signMessage(new TextEncoder().encode(messageToSign));
  const signatureBytes = ("signature" in rawSignature ? rawSignature.signature : rawSignature) as Uint8Array;
  const signature = Buffer.from(signatureBytes).toString("base64");

  return { signMessage, signature };
}

/**
 * Authenticates a user with a wallet
 * Tries to login first, if that fails, will request a signature and send it to the server to either login with signature or signup
 * @param wallet - The wallet to authenticate with
 * @param walletId - The wallet ID to authenticate with
 * @param referralCode - The referral code to authenticate with
 */
export async function authenticate(wallet: Wallet, walletId?: string, referralCode?: string) {
  try {
    const walletAddress = wallet.publicKey?.toBase58();
    if (!walletAddress) {
      return {
        user: null,
        error: "Wallet not connected",
      };
    }

    // Basic client-side validation
    if (!wallet.signMessage) {
      return {
        user: null,
        error: "Wallet does not support message signing",
      };
    }

    // First, try to login without signature
    const loginResult = await login({ walletAddress, walletId });

    // If login succeeded, return the result
    if (loginResult.user) {
      return loginResult;
    }

    // If login requires a signature
    if (loginResult.requiresSignature) {
      try {
        const { signMessage, signature } = await signMessageForAuth(wallet);

        // Try to login with signature
        const loginWithSigResult = await login({
          walletAddress,
          walletId,
          signature,
          signedMessage: signMessage,
        });

        // If login succeeded, return the result
        if (loginWithSigResult.user) {
          return loginWithSigResult;
        }

        // If login failed with "User not found", try to sign up
        if (loginWithSigResult.error === "User not found") {
          return signup({
            walletAddress,
            signature,
            signedMessage: signMessage,
            walletId,
            referralCode,
          });
        }

        // Otherwise, return the login error
        return loginWithSigResult;
      } catch (error) {
        console.error("Authentication error", error);
        return {
          user: null,
          error: error instanceof Error ? error.message : "Authentication failed",
        };
      }
    }

    // If we get here, something else went wrong
    return { user: null, error: loginResult.error || "Authentication failed" };
  } catch (error) {
    console.error("Unexpected authentication error", error);
    return {
      user: null,
      error: error instanceof Error ? error.message : "Unexpected authentication error",
    };
  }
}

export async function getCurrentUser(): Promise<{ user: AuthUser | null; error: any }> {
  try {
    const response = await fetch("/api/auth/user", {
      method: "GET",
      credentials: "include", // Include cookies in the request
      cache: "no-store", // Prevent caching to always get fresh data
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { user: null, error: errorData.error || `HTTP error ${response.status}` };
    }

    const data = await response.json();

    if (data.error) {
      return { user: null, error: data.error };
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error("Failed to get current user:", error);
    return {
      user: null,
      error: error instanceof Error ? error.message : "Failed to get current user",
    };
  }
}

export async function logout(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.error || `HTTP error ${response.status}` };
    }

    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Logout failed",
    };
  }
}

const SALT = process.env.NEXT_PUBLIC_AUTH_PASSWORD_SALT || "marginfi-auth-salt";

export function generateDummyCredentials(walletAddress: string) {
  // Derive a deterministic password using SHA256 + salt
  const derivedPassword = crypto
    .createHash("sha256")
    .update(walletAddress + SALT)
    .digest("hex");

  return {
    email: `${walletAddress.toLowerCase()}@mrgn.group`,
    password: derivedPassword, // This will be the same every time for the same wallet
  };
}
