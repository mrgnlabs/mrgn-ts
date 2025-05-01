import crypto from "crypto";

import { Wallet } from "@mrgnlabs/mrgn-common";
import { Connection } from "@solana/web3.js";

import { AuthUser, SignupPayload, AuthPayload, LoginPayload, AuthResult, LogoutResult } from "../types/auth.types";
import { generateSignMessage, createSignatureMessage, signTransactionWithMemoForAuth } from "./auth-crypto.utils";

export async function login(payload: AuthPayload | LoginPayload): Promise<AuthResult> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    const data = await response.json();

    return {
      ...data,
      statusCode: response.status,
    };
  } catch (error) {
    console.error("Login failed", error);
    return {
      user: null,
      error: error instanceof Error ? error.message : "Login failed",
      statusCode: undefined, // couldn't reach server maybe
    };
  }
}

export async function signup(payload: SignupPayload): Promise<AuthResult> {
  try {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include", // Include cookies in the request
    });

    const data = await response.json();

    return {
      ...data,
      statusCode: response.status,
    };
  } catch (error) {
    console.error("Signup failed", error);
    return {
      user: null,
      error: error instanceof Error ? error.message : "Signup failed",
      statusCode: undefined, // couldn't reach server maybe
    };
  }
}
async function signMessageForAuth(wallet: Wallet, connection: Connection) {
  const signedMessage = generateSignMessage(wallet.publicKey?.toBase58() ?? "");
  const messageToSign = createSignatureMessage(wallet.publicKey?.toBase58() ?? "");

  if (wallet.signMessage) {
    const rawSignature = await wallet.signMessage(new TextEncoder().encode(messageToSign));
    const signatureBytes = ("signature" in rawSignature ? rawSignature.signature : rawSignature) as Uint8Array;
    const signature = Buffer.from(signatureBytes).toString("base64");
    return { signedMessage, signature };
  } else {
    const { signature } = await signTransactionWithMemoForAuth(wallet, messageToSign, connection);
    return { signedMessage, signature };
  } // TODO: this will not work with ledger, we need the user to manually select if theyre using a ledger or not. We can do this within the modal once we release auth
}

/**
 * Authenticate a user with a wallet
 * @param wallet - The wallet to authenticate with
 * @param connection - The Solana connection
 * @param walletId - The wallet ID (for Web3Auth)
 * @param referralCode - Optional referral code
 * @returns The authentication result
 */
export async function authenticate(
  wallet: Wallet,
  connection: Connection,
  walletId?: string,
  referralCode?: string
): Promise<AuthResult> {
  try {
    // First try to login with existing token
    const loginResult = await login({
      walletAddress: wallet.publicKey.toString(),
      walletId,
    });

    // If login succeeded, return the result
    if (loginResult.user) {
      return loginResult;
    }

    // If login failed with a 401 or 404, request a signature and try to login/signup
    if (loginResult.statusCode === 401 || loginResult.statusCode === 404) {
      try {
        // Sign a message for authentication
        const { signature, signedMessage } = await signMessageForAuth(wallet, connection);

        // Create auth payload
        const authPayload: AuthPayload = {
          walletAddress: wallet.publicKey.toString(),
          signature: Buffer.from(signature).toString("base64"),
          signedMessage,
          walletId,
        };

        // Try to login with signature
        const loginWithSignatureResult = await login(authPayload);

        // If login succeeded, return the result
        if (loginWithSignatureResult.user) {
          return loginWithSignatureResult;
        }

        // If login failed with a 404, try to signup
        if (loginWithSignatureResult.statusCode === 404) {
          // Create signup payload
          const signupPayload: SignupPayload = {
            ...authPayload,
            referralCode,
          };

          // Try to signup
          return await signup(signupPayload);
        }

        // If login failed with another error, return the error
        return loginWithSignatureResult;
      } catch (error) {
        console.error("Authentication error", error);
        return {
          user: null,
          error: composeErrorMessage(error),
        };
      }
    }

    // If login failed with another error, return the error
    return loginResult;
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      user: null,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

const composeErrorMessage = (error: any) => {
  if (error instanceof Error) {
    if (error.name === "WalletSignMessageError") {
      //@ts-ignore
      return error.error;
    } else {
      return error.message;
    }
  } else {
    return "Authentication failed";
  }
};

export async function getCurrentUser(): Promise<{ user: AuthUser | null; error: any }> {
  try {
    const response = await fetch("/api/auth/user", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Include cookies in the request
    });

    if (!response.ok) {
      return { user: null, error: `HTTP error! Status: ${response.status}` };
    }

    const data = await response.json();

    return {
      user: data.user,
      error: data.error,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return {
      user: null,
      error: error instanceof Error ? error.message : "Failed to get current user",
    };
  }
}

export async function logout(): Promise<LogoutResult> {
  try {
    // Clear session cookie
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include", // Include cookies in the request
    });

    if (!response.ok) {
      return { success: false, error: `HTTP error! Status: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error("Error during logout:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Logout failed",
    };
  }
}

// Constants for auth
const SALT = process.env.NEXT_PUBLIC_AUTH_PASSWORD_SALT || "marginfi-auth-salt";

export function generateCreds(walletAddress: string) {
  const derivedPassword = crypto
    .createHash("sha256")
    .update(walletAddress + SALT)
    .digest("hex");

  return {
    email: `${walletAddress.toLowerCase()}@mrgn.group`,
    password: derivedPassword,
  };
}
