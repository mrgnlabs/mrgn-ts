import { Button } from "@mui/material";

type AuthDialogSocialButtonProps = {
  provider: string;
  image: React.ReactNode;
  onClick: () => void;
};

export const AuthDialogSocialButton = ({ provider, image, onClick }: AuthDialogSocialButtonProps) => {
  return (
    <Button onClick={() => onClick()} variant="contained" className="w-full">
      {image}
      {provider}
    </Button>
  );
};
