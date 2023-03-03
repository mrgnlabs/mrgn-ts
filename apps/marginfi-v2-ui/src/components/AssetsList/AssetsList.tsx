import React, { FC, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, Skeleton, Table, TableBody, TableContainer, TableHead, TableRow } from "@mui/material";
import { useBanks, useProgram, useUserAccounts } from "~/context";
import { FourOptionToggle, DescriptionOrb } from "./BorrowLendToggle";
import AssetRow from "./AssetRow";
import { TableHeader } from "./TableHeader";
import { productConfig, productTypes } from '~/config';


const AssetsList: FC = () => {

  const [productType, setProductType] = useState(productTypes[0]);
  const { mfiClient } = useProgram();
  const { reload } = useBanks();
  const { extendedBankInfos, selectedAccount, nativeSolBalance } = useUserAccounts();
  const wallet = useWallet();

  // Hack required to circumvent rehydration error
  const [hasMounted, setHasMounted] = React.useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  if (!hasMounted) {
    return null;
  }

  return (
    <>
      <div className="flex justify-start gap-4">
        <FourOptionToggle
          productType={productType}
          setProductType={setProductType}
          productTypes={productTypes}
        />
        <div className="hidden md:flex">
          <DescriptionOrb productType={productType}/>
        </div>
      </div>

      <div>
        <Card elevation={0} className="bg-[rgba(0,0,0,0)] w-full">
          <TableContainer>
            <Table className="table-fixed">
              <TableHead className="hidden lg:flex w-full">
                  <TableHeader
                    config={productConfig[productType].header}
                  />
              </TableHead>
              <TableBody className="flex flex-col gap-4 sm:gap-2">
                {extendedBankInfos.length > 0 ? (
                  extendedBankInfos.map((bankInfo) => (
                    <AssetRow
                      key={bankInfo.tokenName}
                      nativeSolBalance={nativeSolBalance}
                      bankInfo={bankInfo}
                      productType={productType}
                      isConnected={wallet.connected}
                      marginfiAccount={selectedAccount}
                      marginfiClient={mfiClient}
                      reloadBanks={reload}
                    />
                  ))
                ) : (
                  <LoadingAssets />
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </div>
    </>
  );
};

const LOADING_ASSETS = 3;

const LoadingAssets = () => (
  <>
    {[...new Array(LOADING_ASSETS)].map((_, index) => (
      <TableRow key={index}>
        <Skeleton
          component="td"
          sx={{ bgcolor: "grey.900" }}
          variant="rectangular"
          animation="wave"
          className="hidden sm:flex min-h-14 sm:h-14 h-full justify-between items-center flex-col sm:flex-row p-0 px-4 sm:p-2 lg:p-4 border-solid border-[#1C2125] border rounded-md"
        />
      </TableRow>
    ))}
  </>
);

export { AssetsList };
