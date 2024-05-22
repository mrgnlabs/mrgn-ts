import Link from "next/link";

import { IconUpload } from "@tabler/icons-react";

import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export const CreatePool = () => {
  return (
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
          Create Token
        </Button>
      </form>
    </div>
  );
};
