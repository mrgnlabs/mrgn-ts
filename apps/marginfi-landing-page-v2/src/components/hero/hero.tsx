import React from "react";

type HeroProps = {
  heading: string;
  subHeading?: string;
};

export const Hero = ({ heading, subHeading }: HeroProps) => {
  return (
    <div className="w-full max-w-6xl mx-auto py-12 px-6 space-y-8 text-center">
      <Heading text={heading} />
      {subHeading && (
        <h2 className="w-full max-w-3xl mx-auto text-muted-foreground font-light md:text-lg lg:text-xl">
          {subHeading}
        </h2>
      )}
    </div>
  );
};

type HeadingProps = {
  text: string;
};

const Heading = ({ text }: HeadingProps) => {
  const regex = /<strong>(.*?)<\/strong>/g;
  const result = text.split(regex).reduce<(string | JSX.Element)[]>((acc, part, index) => {
    if (index % 2 === 1) {
      acc.push(
        <strong key={index} className="bg-gradient-to-r from-[#247BA0] to-[#FFFFB5] text-transparent bg-clip-text">
          {part}
        </strong>
      );
    } else {
      acc.push(part);
    }
    return acc;
  }, []);

  return <h1 className="text-4xl font-medium md:text-5xl lg:text-6xl">{result}</h1>;
};
