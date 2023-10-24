import Image from "next/image";
import { Button } from "~/components/ui/button";

type AuthDialogSocialButtonProps = {
  name: string;
  image: string;
  onClick: () => void;
};

export const AuthDialogWalletButton = ({ name, image, onClick }: AuthDialogSocialButtonProps) => {
  return (
    <Button onClick={() => onClick()} className="w-full">
      <Image src={image} alt={name} height={10} width={10} />
      {name}
    </Button>
  );
};
