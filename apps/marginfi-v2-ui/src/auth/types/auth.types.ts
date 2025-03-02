export type AuthUser = {
  id: string;
  walletAddress: string;
  walletId?: string;
  referralCode?: string;
  referredBy?: string;
  lastLogin?: string;
};

export type AuthResponse = {
  user: AuthUser | null;
  error: AuthError | null;
  token?: string;
};

export type AuthError = {
  message: string;
  code: string;
};

export type SignMessagePayload = {
  nonce: string;
  walletAddress: string;
  timestamp: number;
};

export type AuthPayload = {
  walletAddress: string;
  signature: string;
  signedMessage: SignMessagePayload;
  walletId?: string;
};

export type SignupPayload = AuthPayload & {
  referralCode?: string;
};

export type LoginPayload = {
  walletAddress: string;
  walletId?: string;
};
