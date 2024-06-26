import React from "react";

import Image from "next/image";
import { useRouter } from "next/router";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { usdFormatter } from "@mrgnlabs/mrgn-common";
import { IconUpload, IconPlus, IconSearch, IconArrowRight, IconLoader2 } from "@tabler/icons-react";
import { useDebounce } from "@uidotdev/usehooks";
import { PublicKey } from "@solana/web3.js";

import { useTradeStore } from "~/store";
import { cn, getTokenImageURL } from "~/utils";

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
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

const formSchema = z.object({
  mint: z.string(),
  name: z.string(),
  symbol: z.string(),
  decimals: z.string().refine((value) => !isNaN(Number(value)), {
    message: "Decimals must be a number",
  }),
  oracle: z.string(),
  image: z.instanceof(File),
});

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
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
  };

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
          form.setValue("image", file);
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
          form.setValue("image", file);
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

      console.log(tokenInfo);

      form.setValue("mint", mint.toBase58());
      form.setValue("name", tokenInfo.content.metadata.name);
      form.setValue("symbol", tokenInfo.content.metadata.symbol);
      form.setValue("decimals", tokenInfo.token_info.decimals.toString());

      setIsSearchingDasApi(false);
      setCreatePoolState(CreatePoolState.FORM);
    } catch (e) {
      console.error(e);
      setIsTokenFetchingError(true);
      setIsSearchingDasApi(false);
    }
  }, [setCreatePoolState, form, mintAddress, setIsSearchingDasApi]);

  React.useEffect(() => {
    if (!searchQuery.length) {
      resetFilteredBanks();
      return;
    }
    searchBanks(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  React.useEffect(() => {
    if (isOpen) {
      setCreatePoolState(CreatePoolState.SEARCH);
      setSearchQuery("");
      setPreviewImage("");
      setIsTokenFetchingError(false);
      resetActiveGroup();
      form.reset();
    }
  }, [isOpen, resetActiveGroup, setCreatePoolState, setSearchQuery, setIsTokenFetchingError]);

  return (
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
      <DialogContent className="w-full space-y-4 sm:max-w-4xl md:max-w-4xl">
        {createPoolState === CreatePoolState.SEARCH && (
          <>
            <div className="text-center space-y-2 max-w-lg mx-auto">
              <h2 className="text-3xl font-medium">Search pools</h2>
              <p className="text-lg text-muted-foreground">
                First search for an existing pool, before creating a new one.
              </p>
            </div>
            <div className="space-y-12">
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
            <div className="text-center space-y-2 max-w-lg mx-auto">
              <h2 className="text-3xl font-medium">Token mint address</h2>
              <p className="text-lg text-muted-foreground">
                Enter the mint address of the token you'd like to create a pool for.
              </p>
            </div>
            <form
              className={cn(
                "space-y-12 w-full flex flex-col items-center",
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
                  <p>Couldn't find token details, please enter manually.</p>
                  <Button variant="secondary" onClick={() => setCreatePoolState(CreatePoolState.FORM)}>
                    Continue
                  </Button>
                </div>
              ) : (
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
              )}
            </form>
          </>
        )}
        {createPoolState === CreatePoolState.FORM && (
          <>
            <div className="text-center space-y-2 max-w-md mx-auto">
              <h2 className="text-3xl font-medium">Confirm token details</h2>
              <p className="text-muted-foreground">Please review and confirm or modify the token details.</p>
            </div>

            <Form {...form}>
              <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div
                    className="flex flex-col gap-2 items-center justify-center cursor-pointer border-2 border-dashed border-border rounded-lg py-8 px-12 text-muted-foreground hover:bg-secondary/20"
                    onClick={handleFileClick}
                    onDrop={handleFileDrop}
                    onDragOver={handleDragOver}
                  >
                    {previewImage ? (
                      <img src={previewImage} alt="Preview" className="max-w-full max-h-48" />
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
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-2 text-sm">
                            <FormLabel className="font-medium">Mint address</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter token address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-2 text-sm">
                            <FormLabel className="font-medium">Token name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter token name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="symbol"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-2 text-sm">
                            <FormLabel className="font-medium">Token symbol</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter token symbol" {...field} />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="decimals"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-2 text-sm">
                            <FormLabel className="font-medium">Token decimals</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Enter token symbol" {...field} />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="oracle"
                      render={({ field }) => (
                        <FormItem>
                          <div className="space-y-2 text-sm">
                            <FormLabel className="font-medium">Oracle address</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter oracle address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    <Button className="w-full" type="submit">
                      Create Pool
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
