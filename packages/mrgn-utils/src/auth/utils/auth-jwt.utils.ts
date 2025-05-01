import jwt from "jsonwebtoken";

export function generateToken(walletAddress: string): string {
  return jwt.sign(
    {
      sub: walletAddress,
      wallet_address: walletAddress,
      role: "authenticated",
      aud: "authenticated",
    },
    process.env.SUPABASE_JWT_SECRET!,
    {
      expiresIn: "24h",
    }
  );
}

export function verifyToken(token: string, currentWalletAddress?: string): boolean {
  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!) as any;

    if (currentWalletAddress) {
      return decoded.wallet_address === currentWalletAddress;
    }
    return true;
  } catch {
    return false;
  }
}
