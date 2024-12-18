import React from "react";
import { CreatePoolState, PoolData } from "../types";

type CreatePoolConfigureProps = {
  poolData: PoolData | null;
  setPoolData: React.Dispatch<React.SetStateAction<PoolData | null>>;
  setCreatePoolState: React.Dispatch<React.SetStateAction<CreatePoolState>>;
};

export const CreatePoolConfigure = ({ poolData, setPoolData, setCreatePoolState }: CreatePoolConfigureProps) => {
  return (
    <>
      <div className="text-center space-y-2 w-full mx-auto">
        <h2 className="text-3xl font-medium">Bank Configuration</h2>
        <p className="text-lg text-muted-foreground">Review the bank configuration and adjust the fees as necessary.</p>
      </div>
    </>
  );
};
