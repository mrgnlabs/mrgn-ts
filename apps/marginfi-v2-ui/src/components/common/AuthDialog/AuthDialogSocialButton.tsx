import { Button } from "~/components/ui/button";

type AuthDialogSocialButtonProps = {
  provider: string;
  image: React.ReactNode;
  onClick: () => void;
};

export const AuthDialogSocialButton = ({ provider, image, onClick }: AuthDialogSocialButtonProps) => {
  return (
    <Button onClick={() => onClick()} size="lg">
      {image}
      {/* print provider with first letter uppercase */}
      {provider.slice(0, 1).toUpperCase() + provider.slice(1)}
    </Button>
  );
};
