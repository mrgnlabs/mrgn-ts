import React from "react";

import Image from "next/image";
import Link from "next/link";

import { IconChevronLeft, IconUpload, IconInfoCircle, IconLoader2 } from "@tabler/icons-react";
import { UseFormReturn } from "react-hook-form";

import { cn } from "@mrgnlabs/mrgn-utils";

import { Form, FormControl, FormField, FormItem, FormLabel } from "~/components/ui/form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

import { CreatePoolState, FormValues } from "~/components/common/Pool/CreatePoolDialog";

type CreatePoolFormProps = {
  isTokenFetchingError: boolean;
  isSubmitting: boolean;
  isReadOnlyMode: boolean;
  previewImage: string | null;

  setCreatePoolState: React.Dispatch<React.SetStateAction<CreatePoolState>>;
  setPreviewImage: React.Dispatch<React.SetStateAction<string | null>>;

  form: UseFormReturn<FormValues>;
  handleFileClick: () => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (data: FormValues) => void;
  reset: () => void;
};

export const CreatePoolForm = ({
  isTokenFetchingError,
  isSubmitting,
  isReadOnlyMode,
  previewImage,
  setCreatePoolState,
  setPreviewImage,
  form,
  handleFileClick,
  handleDragOver,
  handleFileDrop,
  handleFileChange,
  onSubmit,
  reset,
}: CreatePoolFormProps) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
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
        <h2 className="text-3xl font-medium">{isTokenFetchingError ? "Token details" : "Confirm token details"}</h2>
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
                "flex flex-col gap-2 items-center justify-center border-2 border-dashed border-border rounded-lg py-8 px-12 text-muted-foreground hover:bg-secondary/20",
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
                  <p className="text-sm text-center">Image uploading not available</p>
                  {/* <p className="text-sm text-center">Drag and drop your image here or click to select a file</p> */}
                </>
              )}
              <input ref={fileInputRef} className="hidden" type="file" accept="image/*" onChange={handleFileChange} />
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
                          disabled={isReadOnlyMode}
                          placeholder="Enter token address"
                          className={cn(
                            formState.errors.mint && "bg-destructive border-destructive text-destructive-foreground"
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
                          disabled={isReadOnlyMode}
                          placeholder="Enter token name"
                          className={cn(
                            formState.errors.name && "bg-destructive border-destructive text-destructive-foreground"
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
                      <FormLabel className="font-medium">{formState.errors.symbol && "*"}Token symbol</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isReadOnlyMode}
                          placeholder="Enter token symbol"
                          className={cn(
                            formState.errors.symbol && "bg-destructive border-destructive text-destructive-foreground"
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
                      <FormLabel className="font-medium">{formState.errors.decimals && "*"}Token decimals</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter token decimals"
                          disabled={isReadOnlyMode}
                          className={cn(
                            formState.errors.decimals && "bg-destructive border-destructive text-destructive-foreground"
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
                            formState.errors.oracle && "bg-destructive border-destructive text-destructive-foreground"
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
  );
};
