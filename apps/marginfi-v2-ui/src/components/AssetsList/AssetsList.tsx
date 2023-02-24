import React, { FC, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, Skeleton, Table, TableBody, TableContainer, TableHead, TableRow, TableCell } from "@mui/material";
import { useBanks, useProgram, useUserAccounts } from "~/context";
import { FourOptionToggle, DescriptionOrb } from "./BorrowLendToggle";
import AssetRow from "./AssetRow";
import { ProductType } from '~/types';

const AssetsList: FC = () => {
  const productTypes = [ProductType.Lock, ProductType.Lend, ProductType.Borrow, ProductType.Superstake];

  {/********************************/}
  // Header componentns
  const TableHeaderLock = () => (
    <TableRow className="w-full flex">
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
        APY
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
        Total Deposits
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
        Lockup Period
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
        Remaining Capacity
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
        Wallet Balance
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
      </div>
    </TableRow>
  )
  const TableHeaderLend = () => (
    <TableRow className="w-full flex">
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[14.28%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[14.28%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
        APY
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[14.28%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
        Total Deposits
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[14.28%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
        Capacity
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[14.28%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
        Wallet Balance
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[14.28%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
      </div>
    </TableRow>
  )
  const TableHeaderBorrow = () => (
    <TableRow className="w-full flex">
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
        APY
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
        Total Borrows
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
        Available Liquidity
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
        Max LTV
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
        Wallet Balance
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
      </div>
      <div
        className="text-base text-[#cacaca] h-14 p-0 min-w-[12.5%] flex items-center pl-2"
        style={{
          fontWeight: 300,
          whiteSpace: 'nowrap',
        }}
      >
      </div>
    </TableRow>
  )
  const TableHeaders = {
    [ProductType.Lock]: <TableHeaderLock />,
    [ProductType.Lend]: <TableHeaderLend />,
    [ProductType.Borrow]: <TableHeaderBorrow />,
    [ProductType.Superstake]: <></>,
  }
  const DesktopHead = () => (
    <TableHead className="hidden sm:flex w-full">
        {TableHeaders[productType]}
    </TableHead>
  )
  {/********************************/}

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
              <DesktopHead />
              {/* @todo gap may need to be updated here for mobile */}
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
