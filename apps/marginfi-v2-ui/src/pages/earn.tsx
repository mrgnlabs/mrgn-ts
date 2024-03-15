import dynamic from "next/dynamic";

const Earn = dynamic(async () => (await import("~/components/desktop/Earn")).Earn, { ssr: false });

export default function EarnPage() {
  return (
    <>
      <Earn />
    </>
  );
}
