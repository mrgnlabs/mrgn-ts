import { Wallet } from "@mrgnlabs/mrgn-common";
import crypto from "crypto";

import {
  AuthUser,
  SignupPayload,
  AuthPayload,
  LoginPayload,
  AuthApiResponse,
  AuthApiErrorResponse,
  LogoutResponse,
} from "../types/auth.types";
import {
  generateSignMessage,
  createSignatureMessage,
  signTransactionWithMemoForAuth,
} from "../utils/auth-crypto.utils";
import { createBrowserSupabaseClient } from "../client";
import { Connection } from "@solana/web3.js";
import { captureSentryException } from "../../sentry.utils";

export async function login(payload: AuthPayload | LoginPayload): Promise<AuthApiResponse> {
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
    } as AuthApiResponse;
  } catch (error) {
    console.error("Login failed", error);
    return {
      user: null,
      error: error instanceof Error ? error.message : "Login failed",
      statusCode: undefined, // couldn't reach server maybe
    } as AuthApiErrorResponse;
  }
}

export async function signup(payload: SignupPayload): Promise<AuthApiResponse> {
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
    } as AuthApiResponse;
  } catch (error) {
    console.error("Signup failed", error);
    return {
      user: null,
      error: error instanceof Error ? error.message : "Signup failed",
    } as AuthApiErrorResponse;
  }
}

async function signMessageForAuth(wallet: Wallet, connection: Connection) {
  const signMessage = generateSignMessage(wallet.publicKey?.toBase58() ?? "");
  const messageToSign = createSignatureMessage(wallet.publicKey?.toBase58() ?? "");

  if (wallet.signMessage) {
    const rawSignature = await wallet.signMessage(new TextEncoder().encode(messageToSign));
    const signatureBytes = ("signature" in rawSignature ? rawSignature.signature : rawSignature) as Uint8Array;
    const signature = Buffer.from(signatureBytes).toString("base64");
    return { signMessage, signature };
  } else {
    const { signature } = await signTransactionWithMemoForAuth(wallet, messageToSign, connection);
    return { signMessage, signature };
  }
}

/**
 * Authenticates a user with a wallet
 * Tries to login first, if that fails, will request a signature and send it to the server to either login with signature or signup
 * @param wallet - The wallet to authenticate with
 * @param connection - The Solana connection to use
 * @param walletId - The wallet ID to authenticate with
 * @param referralCode - The referral code to authenticate with
 * @returns Authentication response with user data or error
 */
export async function authenticate(
  wallet: Wallet,
  connection: Connection,
  walletId?: string,
  referralCode?: string
): Promise<AuthApiResponse> {
  try {
    const walletAddress = wallet.publicKey?.toBase58();
    if (!walletAddress) {
      return {
        user: null,
        error: "Wallet not connected",
      };
    }

    if (!wallet.signMessage) {
      return {
        user: null,
        error: "Wallet does not support message signing",
      };
    }

    const loginResult = await login({ walletAddress, walletId });

    if (loginResult.user) {
      return loginResult;
    }

    if (loginResult.requiresSignature) {
      try {
        const { signMessage, signature } = await signMessageForAuth(wallet, connection);

        const loginWithSigResult = await login({
          walletAddress,
          walletId,
          signature,
          signedMessage: signMessage,
        });

        if (loginWithSigResult.user) {
          return loginWithSigResult;
        }

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
          error: composeErrorMessage(error),
        };
      }
    }

    // If we get here, something else went wrong
    captureSentryException(loginResult.error, "Error while authenticating", { walletAddress, walletId });
    return { user: null, error: loginResult.error || "Authentication failed" };
  } catch (error) {
    console.error("Unexpected authentication error", error);
    captureSentryException(error, "Unexpected authentication error", { walletAddress: wallet.publicKey?.toBase58() });
    return {
      user: null,
      error: error instanceof Error ? error.message : "Unexpected authentication error",
    };
  }
}

const composeErrorMessage = (error: any) => {
  if (error instanceof Error) {
    if (error.message.length > 0) {
      return error.message;
      //@ts-ignore
    } else if (error.error.length > 0) {
      //@ts-ignore
      return error.error;
    }
  } else {
    return "Authentication failed";
  }
};

export async function logout(): Promise<LogoutResponse> {
  try {
    const supabase = createBrowserSupabaseClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true } as LogoutResponse;
  } catch (error) {
    console.error("Logout error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Logout failed",
    } as LogoutResponse;
  }
}

const SALT = process.env.NEXT_PUBLIC_AUTH_PASSWORD_SALT || "marginfi-auth-salt";

export function generateCreds(walletAddress: string, signature: string) {
  const derivedPassword = crypto
    .createHash("sha256")
    .update(signature + SALT)
    .digest("hex");

  return {
    email: `${walletAddress.toLowerCase()}@mrgn.group`,
    password: derivedPassword,
  };
}
