import React from "react";
import ReactDOM from "react-dom";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";
import { IconPlus } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

import { useTradeStore } from "~/store";
import { cn } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";

import {
  CreatePoolSearch,
  CreatePoolMint,
  CreatePoolForm,
  CreatePoolSuccess,
  CreatePoolState,
  FormValues,
  formSchema,
} from "~/components/common/Pool/CreatePoolDialog/";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { TokenData } from "~/types";
import { CreatePoolLoading } from "./components/CreatePoolLoading";
import { StepperWrapper } from "~/components/ui/Stepper";

type CreatePoolDialogProps = {
  trigger?: React.ReactNode;
};

export const CreatePoolDialog = ({ trigger }: CreatePoolDialogProps) => {
  const [resetSearchResults, searchBanks] = useTradeStore((state) => [state.resetSearchResults, state.searchBanks]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isReadOnlyMode, setIsReadOnlyMode] = React.useState<boolean>(false);
  const [createPoolState, setCreatePoolState] = React.useState<CreatePoolState>(CreatePoolState.SEARCH);
  const [isSearchingDasApi, setIsSearchingDasApi] = React.useState(false);
  const [isTokenFetchingError, setIsTokenFetchingError] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [mintAddress, setMintAddress] = React.useState("");
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [poolCreatedData, setPoolCreatedData] = React.useState<FormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { width, height } = useWindowSize();
  const isMobile = useIsMobile();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  const onSubmit = React.useCallback(
    (values: z.infer<typeof formSchema>) => {
      // Do something with the form values.
      // ✅ This will be type-safe and validated.
      console.log(values);
      setIsSubmitting(true);
      setPoolCreatedData(values);

      setCreatePoolState(CreatePoolState.LOADING);
      setIsSubmitting(false);
    },
    [setIsSubmitting, setPoolCreatedData, setCreatePoolState]
  );

  const handleFileClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const handleFileDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreviewImage(reader.result as string);
            form.setValue("imageUpload", file);
          };
          reader.readAsDataURL(file);
        }
        event.dataTransfer.clearData();
      }
    },
    [form, setPreviewImage]
  );

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleFileChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreviewImage(reader.result as string);
            form.setValue("imageUpload", file);
          };
          reader.readAsDataURL(file);
        }
      }
    },
    [form, setPreviewImage]
  );

  const fetchTokenInfo = React.useCallback(async () => {
    setIsSearchingDasApi(true);

    try {
      const mint = new PublicKey(mintAddress);
      const fetchTokenReq = await fetch(`/api/birdeye/token?address=${mint.toBase58()}`);

      if (!fetchTokenReq.ok) {
        throw new Error("Failed to fetch token info");
      }

      const tokenInfo = (await fetchTokenReq.json()) as TokenData;

      if (!tokenInfo) {
        throw new Error("Could not find token info");
      }

      form.setValue("mint", tokenInfo.address, { shouldValidate: true });
      form.setValue("name", tokenInfo.name, { shouldValidate: true });
      form.setValue("symbol", tokenInfo.symbol, { shouldValidate: true });
      form.setValue("decimals", tokenInfo.decimals.toString(), { shouldValidate: true });
      form.setValue("imageDownload", tokenInfo.imageUrl, { shouldValidate: true });
      setPreviewImage(tokenInfo.imageUrl);
      setIsReadOnlyMode(true);

      setIsSearchingDasApi(false);
      setCreatePoolState(CreatePoolState.FORM);
    } catch (e) {
      console.error(e);
      form.reset();
      setIsReadOnlyMode(false);
      setIsTokenFetchingError(true);
      setIsSearchingDasApi(false);
    }
  }, [setCreatePoolState, form, mintAddress, setIsSearchingDasApi, setIsTokenFetchingError, setPreviewImage]);

  const onCompletion = (props: {
    stableBankPk: PublicKey;
    tokenBankPk: PublicKey;
    groupPk: PublicKey;
    lutAddress: PublicKey;
  }) => {
    // TODO add props to GCP
    setCreatePoolState(CreatePoolState.SUCCESS);
  };

  React.useEffect(() => {
    if (!searchQuery.length) {
      resetSearchResults();
      return;
    }
    searchBanks(searchQuery);
  }, [searchBanks, resetSearchResults, searchQuery]);

  const reset = React.useCallback(() => {
    setPreviewImage("");
    setIsSearchingDasApi(false);
    setIsTokenFetchingError(false);
    setPoolCreatedData(null);
    setIsSubmitting(false);
    form.reset();
  }, [setIsTokenFetchingError, form]);

  React.useEffect(() => {
    reset();
    setSearchQuery("");
    setMintAddress("");
    setCreatePoolState(CreatePoolState.SEARCH);
  }, [isOpen, reset, setSearchQuery, setMintAddress, setCreatePoolState]);

  return (
    <>
      {createPoolState === CreatePoolState.SUCCESS &&
        ReactDOM.createPortal(
          <Confetti
            width={width!}
            height={height! * 2}
            recycle={false}
            opacity={0.4}
            className={cn(isMobile ? "z-[80]" : "z-[60]")}
          />,
          document.body
        )}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) resetSearchResults();
          setIsOpen(open);
        }}
      >
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : (
            <Button>
              <IconPlus size={18} /> Create Pool
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="w-full space-y-4 sm:max-w-4xl md:max-w-4xl z-[70]">
          {createPoolState === CreatePoolState.SEARCH && (
            <CreatePoolSearch
              setIsOpen={setIsOpen}
              setCreatePoolState={setCreatePoolState}
              searchQuery={searchQuery}
              debouncedSearchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          )}
          {createPoolState === CreatePoolState.MINT && (
            <CreatePoolMint
              mintAddress={mintAddress}
              isTokenFetchingError={isTokenFetchingError}
              isSearchingDasApi={isSearchingDasApi}
              setMintAddress={setMintAddress}
              setIsTokenFetchingError={(value) => {
                setIsReadOnlyMode(false);
                setIsTokenFetchingError(value);
              }}
              setCreatePoolState={setCreatePoolState}
              fetchTokenInfo={fetchTokenInfo}
              reset={reset}
            />
          )}
          {createPoolState === CreatePoolState.FORM && (
            <CreatePoolForm
              isReadOnlyMode={isReadOnlyMode}
              isTokenFetchingError={isTokenFetchingError}
              isSubmitting={isSubmitting}
              previewImage={previewImage}
              setCreatePoolState={setCreatePoolState}
              setPreviewImage={setPreviewImage}
              form={form}
              handleFileClick={handleFileClick}
              handleDragOver={handleDragOver}
              handleFileDrop={handleFileDrop}
              handleFileChange={handleFileChange}
              onSubmit={onSubmit}
              reset={reset}
            />
          )}

          {createPoolState === CreatePoolState.LOADING && (
            <CreatePoolLoading
              poolCreatedData={poolCreatedData}
              setIsOpen={setIsOpen}
              setIsCompleted={(props) => onCompletion(props)}
            />
          )}

          {createPoolState === CreatePoolState.SUCCESS && (
            <CreatePoolSuccess poolCreatedData={poolCreatedData} setIsOpen={setIsOpen} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
