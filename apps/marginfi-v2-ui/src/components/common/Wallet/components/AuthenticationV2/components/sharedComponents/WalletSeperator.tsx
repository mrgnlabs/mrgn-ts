export const WalletSeperator = ({ description }: { description: string }) => {
  return (
    <div className="mb-4 mt-8 flex items-center justify-center text-sm">
      <div className="h-[1px] flex-grow bg-input" />
      <span className="px-6 text-gray-500 dark:text-gray-400">{description}</span>
      <div className="h-[1px] flex-grow bg-input" />
    </div>
  );
};
