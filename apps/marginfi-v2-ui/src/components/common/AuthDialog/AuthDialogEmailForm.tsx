import React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

type AuthDialogEmailFormProps = {
  onSubmit: (email: string) => void;
};

export const AuthDialogEmailForm = ({ onSubmit }: AuthDialogEmailFormProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();

        if (!inputRef.current?.value) {
          return;
        }

        onSubmit(inputRef.current?.value);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input ref={inputRef} id="email" type="email" placeholder="example@example.com" className="text-lg h-12" />
      </div>
      <Button type="submit" size="lg">
        Login
      </Button>
    </form>
  );
};
