import { Button } from "~/components/ui/button";

type AuthDialogSocialButtonProps = {
  provider: string;
  image: React.ReactNode;
  onClick: () => void;
};

export const AuthDialogSocialButton = ({ provider, image, onClick }: AuthDialogSocialButtonProps) => {
  return (
    <Button onClick={() => onClick()}>
      {image}
      {provider}
    </Button>
  );
};
