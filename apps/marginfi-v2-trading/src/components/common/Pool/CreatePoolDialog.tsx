import React from "react";

import Link from "next/link";

import { IconUpload, IconPlus, IconSearch } from "@tabler/icons-react";

import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import Image from "next/image";

type CreatePoolDialogProps = {
  trigger?: React.ReactNode;
};

enum CreatePoolState {
  SEARCH = "initial",
  FORM = "form",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

export const CreatePoolDialog = ({ trigger }: CreatePoolDialogProps) => {
  const [createPoolState, setCreatePoolState] = React.useState<CreatePoolState>(CreatePoolState.SEARCH);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button>
            <IconPlus size={18} /> Create Pool
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full space-y-8 sm:max-w-4xl md:max-w-4xl">
        {createPoolState === CreatePoolState.SEARCH && (
          <>
            <div className="text-center space-y-2 max-w-md mx-auto">
              <h2 className="text-3xl font-medium">Search for a pool</h2>
              <p className="text-muted-foreground">Search for an existing pool before creating a new one.</p>
            </div>
            <div className="space-y-6">
              <div className="relative">
                <IconSearch size={18} className="absolute inset-4 text-muted-foreground" />
                <Input
                  className="w-full text-xl h-auto py-2.5 pr-4 pl-11"
                  placeholder="Search token name, symbol, mint address..."
                />
              </div>
              {/* <div>
                <p className="text-sm text-muted-foreground">No results found for "USDC".</p>
              </div> */}
              <div>
                <div className="flex items-center gap-4 py-2">
                  <div className="w-12 h-12 rounded-full bg-red-400" />
                  <h3>Token Name (SYMBOL)</h3>
                </div>
              </div>
            </div>
          </>
        )}
        {createPoolState === CreatePoolState.FORM && (
          <>
            <div className="text-center space-y-2 max-w-md mx-auto">
              <h2 className="text-3xl font-medium">Create a Pool</h2>
              <p className="text-muted-foreground">Create a permissionless pool with marginfi.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-2 items-center justify-center cursor-pointer border-2 border-dashed border-border rounded-lg py-8 px-12 text-muted-foreground hover:bg-secondary/20">
                <IconUpload />
                <p className="text-sm text-center">Drag and drop your image here or click to select a file</p>
                <input className="hidden" type="file" />
              </div>
              <form className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <Label className="font-medium" htmlFor="address">
                      Token Address
                    </Label>
                    <Input id="address" placeholder="Enter token address" required type="text" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <Label className="font-medium" htmlFor="name">
                      Name
                    </Label>
                    <Input id="name" placeholder="Enter token name" required type="text" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <Label className="font-medium" htmlFor="symbol">
                      Symbol
                    </Label>
                    <Input id="symbol" placeholder="Enter token symbol" required type="text" />
                  </div>
                  <div className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="font-medium" htmlFor="symbol">
                        Oracle
                      </Label>
                      <Link href="#" target="_blank" rel="noreferrer">
                        <Button variant="link" size="sm" className="px-0 py-1">
                          More info
                        </Button>
                      </Link>
                    </div>
                    <Input id="symbol" placeholder="Enter oracle symbol" required type="text" />
                  </div>
                </div>
                <Button className="w-full" type="submit">
                  Create Pool
                </Button>
              </form>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
