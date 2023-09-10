import { FC } from "react";

const Footer: FC = () => {
  return (
    <div>
      <nav className="fixed w-full bottom-0 h-[32px] z-10 backdrop-blur-md bg-[#C0B3A5] text-center text-xs text-[rgb(84,84,84)]">
        Omni is highly experimental software. Use with caution. Inaccurate results may be produced.
      </nav>
    </div>
  );
};

export { Footer };
