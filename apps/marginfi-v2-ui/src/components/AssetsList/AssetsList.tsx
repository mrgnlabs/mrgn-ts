import React, { FC, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, Skeleton, Table, TableBody, TableContainer, TableRow } from "@mui/material";
import { useBanks, useProgram, useUserAccounts } from "~/context";
import { FourOptionToggle } from "./BorrowLendToggle";
import AssetRow from "./AssetRow";
import { ProductType } from '~/types';

const AssetsList: FC = () => {
  const productTypes = [ProductType.Lock, ProductType.Lend, ProductType.Borrow, ProductType.Superstake];
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
      <div>
        <FourOptionToggle
          productType={productType}
          setProductType={setProductType}
          productTypes={productTypes}
        />
      </div>

      <div>
        <Card elevation={0} className="bg-[rgba(0,0,0,0)] w-full">
          <TableContainer>
            <Table className="table-fixed">
              <TableBody className="flex flex-col gap-4">
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
          className="flex justify-between items-center h-[78px] p-0 px-2 sm:p-2 lg:p-4 border-solid border-[#1C2125] border rounded-xl gap-2 lg:gap-4"
        />
      </TableRow>
    ))}
  </>
);

export { AssetsList };
