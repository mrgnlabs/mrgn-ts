import Link from "next/link";
import { useRouter } from "next/router";

import { useMrgnlendStore } from "~/store";

import { Loader } from "~/components/ui/loader";
import { CreatePool } from "~/components/common/Trade/CreatePool";

export default function TradePage() {
  const router = useRouter();
  const [initialized] = useMrgnlendStore((state) => [state.initialized]);

  console.log(router.query.symbol);
  return (
    <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28">
      {!initialized && <Loader label="Loading mrgntrade..." className="mt-8" />}
      {initialized && (
        <div className="pt-8">
          <div className="bg-background-gray rounded-xl p-8 max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-2 max-w-md mx-auto">
              <h2 className="text-3xl font-medium">Create a Pool</h2>
              <p className="text-muted-foreground">Id nisi dolor est aute exercitation in fugiat et fugiat aliqua.</p>
            </div>
            <CreatePool />
          </div>
        </div>
      )}
    </div>
  );
}
