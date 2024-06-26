import React from "react";
import ReactDOM from "react-dom";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";
import { shortenAddress, usdFormatter } from "@mrgnlabs/mrgn-common";
import {
  IconUpload,
  IconPlus,
  IconSearch,
  IconArrowRight,
  IconLoader2,
  IconChevronLeft,
  IconInfoCircle,
  IconConfetti,
} from "@tabler/icons-react";
import { useDebounce } from "@uidotdev/usehooks";
import { PublicKey } from "@solana/web3.js";

import { useTradeStore } from "~/store";
import { cn, getTokenImageURL } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";

import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";

type CreatePoolDialogProps = {
  trigger?: React.ReactNode;
};

enum CreatePoolState {
  SEARCH = "initial",
  MINT = "mint",
  FORM = "form",
  SUCCESS = "success",
  ERROR = "error",
}

const formSchema = z
  .object({
    mint: z.string(),
    name: z.string(),
    symbol: z.string(),
    decimals: z.string().refine((value) => !isNaN(Number(value)), {
      message: "Decimals must be a number",
    }),
    oracle: z.string(),
    imageUpload: typeof window !== "undefined" ? z.instanceof(File).optional() : z.any().optional(),
    imageDownload: z.string().optional(),
  })
  .refine((data) => data.imageUpload || data.imageDownload, {
    message: "Token image must be provided",
    path: ["imageUpload", "imageDownload"],
  });

type FormValues = z.infer<typeof formSchema>;

export const CreatePoolDialog = ({ trigger }: CreatePoolDialogProps) => {
  const router = useRouter();
  const [filteredBanks, resetFilteredBanks, searchBanks, resetActiveGroup] = useTradeStore((state) => [
    state.filteredBanks,
    state.resetFilteredBanks,
    state.searchBanks,
    state.resetActiveGroup,
  ]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [createPoolState, setCreatePoolState] = React.useState<CreatePoolState>(CreatePoolState.SEARCH);
  const [isSearchingDasApi, setIsSearchingDasApi] = React.useState(false);
  const [isTokenFetchingError, setIsTokenFetchingError] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [mintAddress, setMintAddress] = React.useState("");
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [poolCreatedData, setPoolCreatedData] = React.useState<FormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { width, height } = useWindowSize();
  const isMobile = useIsMobile();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = React.useCallback((values: z.infer<typeof formSchema>) => {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
    setIsSubmitting(true);
    setPoolCreatedData(values);

    setTimeout(() => {
      setCreatePoolState(CreatePoolState.SUCCESS);
      setIsSubmitting(false);
    }, 2000);
  }, []);

  const handleFileClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
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
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const fetchTokenInfo = React.useCallback(async () => {
    setIsSearchingDasApi(true);

    try {
      const mint = new PublicKey(mintAddress);
      const fetchTokenReq = await fetch(`/api/asset-search?address=${mint.toBase58()}`);

      if (!fetchTokenReq.ok) {
        throw new Error("Failed to fetch token info");
      }

      const tokenInfo = await fetchTokenReq.json();

      if (!tokenInfo || tokenInfo.interface !== "FungibleToken") {
        throw new Error("Invalid token mint address");
      }

      const image =
        tokenInfo.content.files && tokenInfo.content.files.length ? tokenInfo.content.files[0].cdn_uri || "" : null;

      form.setValue("mint", mint.toBase58());
      form.setValue("name", tokenInfo.content.metadata.name || "");
      form.setValue("symbol", tokenInfo.content.metadata.symbol || "");
      form.setValue("decimals", tokenInfo.token_info.decimals ? tokenInfo.token_info.decimals.toString() : "");
      form.setValue("imageDownload", image || "");
      setPreviewImage(image || "");

      setIsSearchingDasApi(false);
      setCreatePoolState(CreatePoolState.FORM);
    } catch (e) {
      console.error(e);
      setIsTokenFetchingError(true);
      setIsSearchingDasApi(false);
    }
  }, [setCreatePoolState, form, mintAddress, setIsSearchingDasApi, setIsTokenFetchingError, setPreviewImage]);

  React.useEffect(() => {
    if (!searchQuery.length) {
      resetFilteredBanks();
      return;
    }
    searchBanks(debouncedSearchQuery);
  }, [debouncedSearchQuery, searchBanks, resetFilteredBanks, searchQuery]);

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
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            <>
              <div className="text-center space-y-2 max-w-lg mx-auto">
                <h2 className="text-3xl font-medium">Search existing pools</h2>
                <p className="text-lg text-muted-foreground">Search for an existing pool before creating a new one.</p>
              </div>
              <div className="space-y-8">
                <div className="relative w-full max-w-2xl mx-auto">
                  <IconSearch
                    size={18}
                    className={cn(
                      "absolute inset-y-0 left-5 h-full text-muted-foreground transition-colors md:left-6",
                      searchQuery.length && "text-primary"
                    )}
                  />
                  <div className="bg-gradient-to-r from-mrgn-gold/80 to-mrgn-chartreuse/80 rounded-full p-0.5 transition-colors">
                    <Input
                      ref={searchInputRef}
                      placeholder="Search tokens by name, symbol, or mint address..."
                      className="py-2 pr-6 pl-12 h-auto text-lg rounded-full bg-background outline-none focus-visible:ring-primary/75"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  {debouncedSearchQuery.length > 1 && filteredBanks.length === 0 && (
                    <div className="text-center text-muted-foreground w-full">
                      <p>No results found for &quot;{debouncedSearchQuery}&quot;</p>
                    </div>
                  )}

                  {filteredBanks.length > 0 && (
                    <div className="space-y-3">
                      {filteredBanks.slice(0, 5).map((bank, index) => (
                        <button
                          onClick={() => {
                            resetActiveGroup();
                            router.push(`/pools/${bank.address.toBase58()}`);
                            setIsOpen(false);
                          }}
                          className="flex flex-col items-center w-full gap-4 even:bg-background-gray px-4 py-3 rounded-lg cursor-pointer hover:bg-background-gray-light/50 md:flex-row md:justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <Image
                              src={getTokenImageURL(bank.meta.tokenSymbol)}
                              width={32}
                              height={32}
                              alt={bank.meta.tokenSymbol}
                              className="rounded-full"
                            />
                            <h3>
                              {bank.meta.tokenName} ({bank.meta.tokenSymbol})
                            </h3>
                          </div>
                          <div className="flex items-center gap-12 text-sm md:ml-auto md:text-right">
                            <p className="space-x-1.5">
                              <strong className="font-medium">Price:</strong>{" "}
                              <span className="font-mono text-sm text-muted-foreground">
                                {usdFormatter.format(bank.info.oraclePrice.priceRealtime.price.toNumber())}
                              </span>
                            </p>
                            <p className="space-x-1.5">
                              <strong className="font-medium">Deposits:</strong>{" "}
                              <span className="font-mono text-sm text-muted-foreground">
                                {usdFormatter.format(
                                  bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber()
                                )}
                              </span>
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {debouncedSearchQuery.length > 1 && (
                    <div className="flex justify-center pt-4">
                      <Button onClick={() => setCreatePoolState(CreatePoolState.MINT)} variant="secondary">
                        <IconPlus size={18} /> Create new pool
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          {createPoolState === CreatePoolState.MINT && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 absolute top-2 left-1.5 text-muted-foreground"
                onClick={() => {
                  setCreatePoolState(CreatePoolState.SEARCH);
                  reset();
                }}
              >
                <IconChevronLeft size={18} /> Back
              </Button>
              <div className="text-center space-y-2 max-w-lg mx-auto">
                <h2 className="text-3xl font-medium">Token mint address</h2>
                <p className="text-lg text-muted-foreground">
                  Enter the mint address of the token you&apos;d like to create a pool for.
                </p>
              </div>
              <form
                className={cn(
                  "space-y-8 w-full flex flex-col items-center",
                  isSearchingDasApi && "pointer-events-none animate-pulsate"
                )}
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchTokenInfo();
                }}
              >
                <div className="w-full bg-gradient-to-r from-mrgn-gold/80 to-mrgn-chartreuse/80 rounded-full p-0.5 transition-colors">
                  <Input
                    disabled={isSearchingDasApi}
                    placeholder="Token mint address..."
                    className="py-2 px-6 h-auto text-lg rounded-full bg-background outline-none focus-visible:ring-primary/75 disabled:opacity-100"
                    autoFocus
                    value={mintAddress}
                    onChange={(e) => setMintAddress(e.target.value)}
                  />
                </div>

                {isTokenFetchingError ? (
                  <div className="flex flex-col justify-center items-center gap-4 text-sm text-muted-foreground">
                    <p>Could not find token details, please enter manually.</p>
                    <Button variant="secondary" onClick={() => setCreatePoolState(CreatePoolState.FORM)}>
                      Continue
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <Button disabled={isSearchingDasApi || !mintAddress.length} type="submit" variant="secondary">
                      {!isSearchingDasApi && (
                        <>
                          Fetch token info <IconArrowRight size={18} />
                        </>
                      )}
                      {isSearchingDasApi && (
                        <>
                          <IconLoader2 size={18} className="animate-spin" /> Fetching token info...
                        </>
                      )}
                    </Button>
                    <Button
                      variant="link"
                      className="font-normal text-xs text-muted-foreground underline opacity-75 transition-opacity hover:opacity-100"
                      onClick={() => {
                        setCreatePoolState(CreatePoolState.FORM);
                        setIsTokenFetchingError(true);
                      }}
                    >
                      Skip and add details manually
                    </Button>
                  </div>
                )}
              </form>
            </>
          )}
          {createPoolState === CreatePoolState.FORM && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 absolute top-2 left-1.5 text-muted-foreground"
                onClick={() => {
                  setCreatePoolState(CreatePoolState.MINT);
                  reset();
                }}
              >
                <IconChevronLeft size={18} /> Back
              </Button>
              <div className="text-center space-y-2 max-w-md mx-auto">
                <h2 className="text-3xl font-medium">
                  {isTokenFetchingError ? "Token details" : "Confirm token details"}
                </h2>
                <p className="text-muted-foreground">
                  {isTokenFetchingError
                    ? "Please provide details about the token."
                    : "Please review and modify the token details if needed."}
                </p>
              </div>

              <Form {...form}>
                <form
                  className={cn("space-y-6", isSubmitting && "pointer-events-none animate-pulsate")}
                  onSubmit={form.handleSubmit(onSubmit)}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div
                      className={cn(
                        "flex flex-col gap-2 items-center justify-center cursor-pointer border-2 border-dashed border-border rounded-lg py-8 px-12 text-muted-foreground hover:bg-secondary/20",
                        form.formState.isSubmitted &&
                          !form.getValues().imageUpload &&
                          !form.getValues().imageDownload &&
                          "border-destructive bg-destructive hover:bg-destructive"
                      )}
                      onClick={handleFileClick}
                      onDrop={handleFileDrop}
                      onDragOver={handleDragOver}
                    >
                      {previewImage ? (
                        <Image
                          src={previewImage}
                          alt="Preview"
                          className="max-w-full max-h-48 rounded-full"
                          height={192}
                          width={192}
                        />
                      ) : (
                        <>
                          <IconUpload />
                          <p className="text-sm text-center">Drag and drop your image here or click to select a file</p>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        className="hidden"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </div>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="mint"
                        render={({ field, formState }) => (
                          <FormItem>
                            <div className="space-y-2 text-sm">
                              <FormLabel className="font-medium">{formState.errors.mint && "*"}Mint address</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter token address"
                                  className={cn(
                                    formState.errors.mint &&
                                      "bg-destructive border-destructive text-destructive-foreground"
                                  )}
                                  {...field}
                                />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field, formState }) => (
                          <FormItem>
                            <div className="space-y-2 text-sm">
                              <FormLabel className="font-medium">{formState.errors.name && "*"}Token name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter token name"
                                  className={cn(
                                    formState.errors.name &&
                                      "bg-destructive border-destructive text-destructive-foreground"
                                  )}
                                  {...field}
                                />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="symbol"
                        render={({ field, formState }) => (
                          <FormItem>
                            <div className="space-y-2 text-sm">
                              <FormLabel className="font-medium">
                                {formState.errors.symbol && "*"}Token symbol
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter token symbol"
                                  className={cn(
                                    formState.errors.symbol &&
                                      "bg-destructive border-destructive text-destructive-foreground"
                                  )}
                                  {...field}
                                />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="decimals"
                        render={({ field, formState }) => (
                          <FormItem>
                            <div className="space-y-2 text-sm">
                              <FormLabel className="font-medium">
                                {formState.errors.decimals && "*"}Token decimals
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Enter token decimals"
                                  className={cn(
                                    formState.errors.decimals &&
                                      "bg-destructive border-destructive text-destructive-foreground"
                                  )}
                                  {...field}
                                />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="oracle"
                        render={({ field, formState }) => (
                          <FormItem>
                            <div className="space-y-2 text-sm">
                              <FormLabel className="font-medium flex items-center justify-between gap-2">
                                {formState.errors.oracle && "*"}Oracle address
                                <Link
                                  href="#"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group flex items-center gap-1 font-normal text-xs text-muted-foreground"
                                >
                                  <IconInfoCircle size={16} />{" "}
                                  <span className="border-b border-transparent transition-colors group-hover:border-muted-foreground/75">
                                    more info
                                  </span>
                                </Link>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter oracle address"
                                  className={cn(
                                    formState.errors.oracle &&
                                      "bg-destructive border-destructive text-destructive-foreground"
                                  )}
                                  {...field}
                                />
                              </FormControl>
                            </div>
                          </FormItem>
                        )}
                      />
                      <Button className="w-full" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <IconLoader2 size={18} className="animate-spin" /> Creating pool...
                          </>
                        ) : (
                          "Create Pool"
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </>
          )}

          {createPoolState === CreatePoolState.SUCCESS && (
            <div className="flex flex-col justify-center items-center gap-12">
              <div className="text-center space-y-12">
                <div className="flex flex-col items-center gap-3">
                  <IconConfetti size={48} />
                  <h2 className="text-3xl font-medium">Pool created!</h2>
                  <p className="text-muted-foreground">
                    Your pool has been created. It will be verified before it shows on mrgntrade.
                  </p>
                </div>
                {poolCreatedData && (
                  <div className="flex flex-col items-center justify-center gap-3 mt-8">
                    <Image
                      src={poolCreatedData.imageUpload || poolCreatedData.imageDownload!}
                      alt={`${poolCreatedData.symbol} image`}
                      width={64}
                      height={64}
                      className="rounded-full"
                    />
                    <h1 className="font-medium text-xl">
                      {poolCreatedData.name} <span className="font-normal">({poolCreatedData.symbol})</span>
                    </h1>
                    <Link
                      href={`https://solscan.io/account/${poolCreatedData.mint}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-mrgn-chartreuse border-b border-mrgn-chartreuse transition-colors hover:border-transparent"
                    >
                      {shortenAddress(poolCreatedData.mint)}
                    </Link>
                  </div>
                )}
              </div>
              <Button onClick={() => setIsOpen(false)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
