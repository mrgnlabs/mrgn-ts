import { Wallet } from "@mrgnlabs/mrgn-common";

import { AuthUser, SignupPayload, AuthPayload } from "../types/auth.types";
import { generateSignMessage } from "../utils/auth-crypto.utils";
import { createBrowserSupabaseClient } from "../auth-client";

export async function loginOrSignup(
  wallet: Wallet,
  walletId?: string,
  referralCode?: string
): Promise<{ user: AuthUser | null; error: any }> {
  const walletAddress = wallet.publicKey?.toBase58();
  if (!walletAddress) {
    throw new Error("Wallet not connected");
  }

  // First, try to login without signature
  const loginResponse = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, walletId }),
    credentials: "include",
  });

  const loginResult = await loginResponse.json();

  // If login succeeded, return the result
  if (loginResponse.ok && loginResult.user) {
    return loginResult;
  }

  // If login failed with requiresSignature, we need to sign a message
  if (loginResult.requiresSignature && wallet.signMessage) {
    // Get signature for authentication
    const signMessage = await generateSignMessage(walletAddress);
    const rawSignature = await wallet.signMessage(new TextEncoder().encode(JSON.stringify(signMessage)));

    // Handle both Phantom and standard wallet adapter signature formats
    const signatureBytes = ("signature" in rawSignature ? rawSignature.signature : rawSignature) as Uint8Array;
    const signature = Buffer.from(signatureBytes).toString("base64");

    // Check if user exists
    const user = await getUser(walletAddress);

    if (!user) {
      // New user - signup
      return signup({
        walletAddress,
        signature,
        signedMessage: signMessage,
        walletId,
        referralCode,
      });
    } else {
      // Existing user - login with signature
      return login({
        walletAddress,
        walletId,
        signature,
        signedMessage: signMessage,
      });
    }
  }

  // If we get here, something else went wrong
  return { user: null, error: loginResult.error || "Authentication failed" };
}

export async function login(payload: AuthPayload) {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include", // Include cookies in the request
    });

    const data = await response.json();

    if (data.token) {
      localStorage.setItem("token", data.token); // Store token after login
    }

    return data;
  } catch (error) {
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

    if (data.token) {
      localStorage.setItem("token", data.token); // Store token after signup
    }

    return data;
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : "Signup failed",
    };
  }
}

export async function getUser(walletAddress: string) {
  const supabase = createBrowserSupabaseClient();
  const { data } = await supabase.from("users").select().eq("wallet_address", walletAddress).single();

  return data;
}

export async function logout(): Promise<void> {
  // Clear the auth cookie by making a request to the logout endpoint
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include", // Important: include cookies in the request
  });

  const supabase = createBrowserSupabaseClient();
  await supabase.auth.signOut();
}
