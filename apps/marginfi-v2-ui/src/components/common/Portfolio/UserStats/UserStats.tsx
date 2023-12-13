import React, { FC } from "react";

interface props {
  supplied: string;
  borrowed: string;
  netValue: string;
  interest: string;
}

export const UserStats: FC<props> = ({ supplied, borrowed, netValue, interest }) => {
  return (
    <div className="flex justify-between flex-wrap mt-5 mb-10 gap-y-4">
      <Stat label="Supplied" value={supplied} />
      <Stat label="Borrowed" value={borrowed} />
      <Stat label="Net value" value={netValue} />
      <Stat label="Interest earned" value={interest} />
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <dl className="w-1/2 md:w-auto">
    <dt className="text-sm">{label}</dt>
    <dd className="text-xl font-medium text-white">{value}</dd>
  </dl>
);
