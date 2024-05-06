export const Investors = () => {
  return (
    <div className="relative z-10 container max-w-7xl flex flex-col gap-16 justify-center items-center text-center py-24">
      <header className="space-y-8">
        <h2 className="text-5xl font-medium">
          marginfi is built by a world-class team united by deep convictions on the evolution of finance
        </h2>
        <h3 className="text-3xl font-medium">
          and we&apos;ve raised <strong className="text-mrgn-chartreuse">$8M lifetime</strong> to make this happen.
        </h3>
      </header>
      <ul className="grid grid-cols-4 gap-1.5 w-full">
        {[...new Array(8)].map((index) => (
          <li className="bg-secondary h-[120px] rounded-md"></li>
        ))}
      </ul>
    </div>
  );
};
