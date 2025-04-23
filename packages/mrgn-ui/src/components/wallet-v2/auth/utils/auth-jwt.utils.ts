import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

export function generateToken(walletAddress: string): string {
  return jwt.sign(
    {
      sub: walletAddress,
      wallet_address: walletAddress,
      role: "authenticated",
      aud: "authenticated",
    },
    JWT_SECRET,
    {
      expiresIn: "24h",
    }
  );
}

export function verifyToken(token: string, currentWalletAddress?: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (currentWalletAddress) {
      return decoded.wallet_address === currentWalletAddress;
    }

    return true;
  } catch {
    return false;
  }
}
