import React from "react";

import Link from "next/link";

type ScrollToProps = {
  to: string;
  children: React.ReactNode;
};

export const ScrollTo = ({ to, children }: ScrollToProps) => {
  const id = `#${to}`;

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const target = document.querySelector(id);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    },
    [to]
  );

  return (
    <Link href={id} onClick={handleClick}>
      {children}
    </Link>
  );
};
