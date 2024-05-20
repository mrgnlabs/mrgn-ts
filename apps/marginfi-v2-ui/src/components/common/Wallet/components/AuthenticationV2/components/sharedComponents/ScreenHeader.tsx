import React from "react";

interface props {
  title: string;
  description: string;
}

export const ScreenHeader = ({ title, description }: props) => {
  return (
    <header className="cursor-pointer">
      <h2 className="font-semibold text-2xl text-white">{title}</h2>
      <p className="mt-2 text-sm sm:text-base">{description}</p>
    </header>
  );
};
