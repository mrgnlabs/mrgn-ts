import { cn } from "@mrgnlabs/mrgn-utils";

import { Button } from "~/components/ui/button";
import { BankToken, bankTokens } from "./tokenSeeds";

type CreatePoolSuccessProps = {
  currentIndex: number;
  createNext: () => void;
};

export const CreatePoolSetup = ({ currentIndex, createNext }: CreatePoolSuccessProps) => {
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center w-full justify-between">
        <h3 className="text-2xl font-bold mb-2">Banks to create</h3>
        <Button onClick={() => createNext()}>Create</Button>
      </div>
      <BankTokens tokens={bankTokens} currentIndex={currentIndex} />
    </div>
  );
};

interface BankTokensProps {
  tokens: BankToken[];
  currentIndex: number;
}

const BankTokens: React.FC<BankTokensProps> = ({ tokens, currentIndex }) => {
  return (
    <div className="flex  flex-col h-96 overflow-y-auto p-4">
      {tokens.map((token, index) => {
        let message = "Done";

        if (index === currentIndex) {
          message = "Up next";
        }

        return (
          <div
            key={index}
            className={cn(
              "border relative rounded-lg shadow-lg p-4 mb-4 bg-white",
              currentIndex < index && "opacity-50"
            )}
          >
            {index <= currentIndex && <p className="absolute top-4 right-4">{message}</p>}
            <h2 className="text-xl font-bold mb-2">{token.tag}</h2>
            <p>
              <strong>Token:</strong> {token.token}
            </p>
            <p>
              <strong>Oracle Type:</strong> {token.oracleType}
            </p>
            <p>
              <strong>Oracle:</strong> {token.oracle}
            </p>
            <p>
              <strong>Borrow Limit:</strong> {token.borrowLimit}
            </p>
            <p>
              <strong>Deposit Limit:</strong> {token.depositLimit}
            </p>
          </div>
        );
      })}
    </div>
  );
};
