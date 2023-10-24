import React from "react";
import { Button, TextField } from "@mui/material";

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
      <TextField ref={inputRef} type="email" placeholder="Email address" variant="outlined" />
      <Button type="submit" variant="contained">
        Login
      </Button>
    </form>
  );
};
