import React from "react";

import { motion } from "framer-motion";

import { IconMrgn } from "~/components/ui/icons";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "~/components/ui/carousel";
import { Button } from "~/components/ui/button";

import { type CarouselApi } from "~/components/ui/carousel";

export const Tutorial = () => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <div className="fixed top-0 left-0 w-screen h-screen bg-background md:max-w-none md:max-h-none md:h-screen z-[999999]">
      <motion.div
        className="w-full h-full flex justify-center items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Carousel setApi={setApi} className="w-full text-primary/80" opts={{ duration: 0 }}>
          <CarouselContent>
            <CarouselItem>
              <div className="flex flex-col gap-12 items-center justify-center text-center max-w-2xl mx-auto">
                <header className="flex flex-col gap-8 items-center justify-center">
                  <IconMrgn size={56} />
                  <div className="text-center space-y-4">
                    <h2 className="text-primary font-medium text-5xl font-orbitron">Welcome to the arena</h2>
                    <h3 className="text-2xl">Memecoin trading, with leverage.</h3>
                  </div>
                </header>
                <Button onClick={() => api?.scrollNext()}>Get started</Button>
              </div>
            </CarouselItem>
            {[...new Array(4)].map((_, index) => (
              <CarouselItem key={index}>
                <div className="flex flex-col gap-8 items-center justify-center text-center max-w-2xl mx-auto">
                  <div className="flex flex-col gap-4 items-center justify-center">
                    <header className="flex flex-col gap-4 items-center justify-center">
                      <IconMrgn size={42} />
                      <h2 className="text-primary font-medium text-4xl">Number {index + 1} heading here</h2>
                    </header>
                    <p className="text-lg">
                      Sunt ea voluptate qui anim ullamco adipisicing consectetur fugiat enim. Non deserunt in cillum
                      anim et dolor mollit sit. Sunt eiusmod occaecat exercitation exercitation pariatur laboris dolor
                      ullamco est excepteur.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => api?.scrollNext()}>
                    Next
                  </Button>
                </div>
              </CarouselItem>
            ))}
            <CarouselItem>
              <div className="flex flex-col gap-8 items-center justify-center text-center max-w-2xl mx-auto">
                <div className="flex flex-col gap-4 items-center justify-center">
                  <header className="flex flex-col gap-4 items-center justify-center">
                    <IconMrgn size={42} />
                    <h2 className="text-primary font-medium text-4xl">Final heading here</h2>
                  </header>
                  <p className="text-lg">
                    Sunt ea voluptate qui anim ullamco adipisicing consectetur fugiat enim. Non deserunt in cillum anim
                    et dolor mollit sit. Sunt eiusmod occaecat exercitation exercitation pariatur laboris dolor ullamco
                    est excepteur.
                  </p>
                </div>
                <Button onClick={() => api?.scrollNext()}>Enter the arena</Button>
              </div>
            </CarouselItem>
          </CarouselContent>
          {current > 1 && <CarouselPrevious className="left-8" />}
          {current > 1 && current < count && <CarouselNext className="right-8" />}
        </Carousel>
      </motion.div>
    </div>
  );
};
