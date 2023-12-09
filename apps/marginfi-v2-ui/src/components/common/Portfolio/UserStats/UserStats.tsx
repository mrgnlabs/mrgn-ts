import React, { FC } from "react";

interface props {
  supplied: string;
  borrowed: string;
  netValue: string;
  interest: string;
}

export const UserStats: FC<props> = ({ supplied, borrowed, netValue, interest }) => {
  return (
    <div className="flex justify-between flex-wrap my-5">
      <Stat label="Supplied" value={supplied} />
      <Stat label="Borrowed" value={borrowed} />
      <Stat label="Net value" value={netValue} />
      <Stat label="Total interest" value={interest} />
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <dl className="w-40 sm:w-60 ">
    <dt className="text-sm">{label}</dt>
    <dd className="text-xl font-medium text-white">{value}</dd>
  </dl>
);
