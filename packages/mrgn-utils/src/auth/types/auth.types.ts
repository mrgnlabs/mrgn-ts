export type AuthUser = {
  id: string;
  walletAddress: string;
  walletId?: string;
  referralCode?: string;
  referredBy?: string;
  lastLogin?: string;
};

export type AuthError = {
  message: string;
  code: string;
};

export type SignMessagePayload = {
  nonce: string;
  walletAddress: string;
  timestamp: number;
  formattedMessage?: string;
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

export type AuthApiSuccessResponse = {
  user: AuthUser;
  statusCode?: number;
  error?: never;
};

export type AuthApiErrorResponse = {
  user: null;
  error: string;
  requiresSignature?: boolean;
  statusCode?: number;
};

export type AuthApiResponse = AuthApiSuccessResponse | AuthApiErrorResponse;

export type LogoutResponse = {
  success: boolean;
  error?: string;
};
