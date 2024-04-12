import { IconProps } from "~/components/ui/icons";

export enum MintPageState {
  DEFAULT = "default",
  ERROR = "error",
  SUCCESS = "success",
}

export interface MintCardProps {
  title: "YBX" | "LST";
  label: string;
  labelIcon: ({ size, className }: IconProps) => JSX.Element;
  icon: ({ size, className }: IconProps) => JSX.Element;
  description: string;
  features: string[];
  volume: string;
  volumeUsd: string;
  tvl: string;
  action: () => void;
}

export interface IntegrationsData {
  title: string;
  quoteIcon: (({ size, className }: IconProps) => React.JSX.Element) | string;
  baseIcon: (({ size, className }: IconProps) => React.JSX.Element) | string;
  poolInfo: {
    dex: string;
    poolId: string;
  };
  info?: {
    tvl: string;
    vol: string;
  };
  link: string;
  action: string;
  platform: {
    title: string;
    icon: ({ size, className }: IconProps) => React.JSX.Element;
  };
}

export const signUpYbx = async (
  emailInputRef: React.RefObject<HTMLInputElement>,
  type: "partner" | "notifications"
) => {
  if (!emailInputRef.current) {
    return;
  }

  const formId =
    type === "partner"
      ? process.env.NEXT_PUBLIC_CONVERT_KIT_YBX_PARTNER_FORM_UID
      : process.env.NEXT_PUBLIC_CONVERT_KIT_YBX_NOTIFICATIONS_FORM_UID;

  const res = await fetch(`https://api.convertkit.com/v3/forms/${formId}/subscribe`, {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      api_key: process.env.NEXT_PUBLIC_CONVERT_KIT_API_KEY,
      email: emailInputRef.current.value,
    }),
  });

  if (!res.ok) {
    throw new Error("Something went wrong subscribing");
  }

  return;
};

export interface MintOverview {
  volume: number;
  volumeUsd: number;
  tvl: number;
}

export async function fetchMintOverview(mint: string): Promise<MintOverview> {
  const response = await fetch(`/api/birdeye/overview?token=${mint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const responseBody = await response.json();
  console.log({ responseBody });
  if (responseBody.success) {
    const volume = responseBody.data.v24h;
    const volumeUsd = responseBody.data.v24hUSD;
    const tvl = responseBody.data.liquidity;
    return {
      volume,
      volumeUsd,
      tvl,
    };
  }

  throw new Error("Failed to fetch token overview");
}
