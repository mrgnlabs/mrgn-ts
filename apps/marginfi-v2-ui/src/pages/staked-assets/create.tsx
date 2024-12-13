import { useCallback, useState } from "react";

import { useDropzone } from "react-dropzone";
import { IconPhoto } from "@tabler/icons-react";
import { cn, useIsMobile } from "@mrgnlabs/mrgn-utils";

import { PageHeading } from "~/components/common/PageHeading";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export default function CreateStakedAssetPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const isMobile = useIsMobile();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
    maxFiles: 1,
  });

  return (
    <div>
      <PageHeading
        heading="Staked Asset Banks"
        body={<p>Create a new staked asset bank and let stakers use their native stake as collateral.</p>}
      />
      <form className="flex flex-col gap-8 px-4 md:px-0">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Vote Account Key</Label>
          <Input id="name" placeholder="Enter validator vote account public key" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Asset Name</Label>
          <Input id="name" placeholder="Enter asset ticker" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="logo">Asset Logo</Label>
          <div
            className={cn(
              "flex gap-4 items-center cursor-pointer p-4 group rounded-lg transition-colors hover:bg-background-gray",
              isDragActive && "bg-background-gray-light"
            )}
            {...getRootProps()}
          >
            <div
              className={cn(
                "border flex items-center justify-center rounded-full w-16 h-16 bg-background-gray-light border-background-gray-light transition-colors text-center text-input",
                "group-hover:border-input group-hover:bg-input group-hover:text-primary",
                isDragActive && "border-input bg-input text-primary"
              )}
            >
              <input {...getInputProps()} />
              <IconPhoto size={24} />
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedFile
                ? `File: ${selectedFile.name}`
                : isMobile
                ? "Tap to select an image"
                : "Drop an image here or click to select"}
            </p>
          </div>
        </div>
        <Button disabled={true} type="submit" size="lg">
          Create Staked Asset Bank
        </Button>
      </form>
    </div>
  );
}
