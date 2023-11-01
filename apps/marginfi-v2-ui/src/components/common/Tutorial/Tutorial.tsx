import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import ArrowRight from "@mui/icons-material/ArrowRight";
import { Button, Dialog, DialogContent } from "@mui/material";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import { useSwiper } from "swiper/react";

type TutorialSlideProps = {
  heading?: string;
  next?: string;
  children: React.ReactNode;
};

const TutorialSlide = ({ children, heading, next }: TutorialSlideProps) => {
  const swiper = useSwiper();
  return (
    <div className="py-32">
      {heading && <h2>{heading}</h2>}
      {children}
      {next && (
        <Button
          onClick={() => {
            swiper.slideNext();
          }}
        >
          {next} <ArrowRight />
        </Button>
      )}
    </div>
  );
};

export const Tutorial = () => {
  const [open, setOpen] = React.useState(true);

  return (
    <Dialog
      open={open}
      onClose={() => {
        setOpen(false);
      }}
      maxWidth="xl"
      PaperProps={{
        style: {
          backgroundColor: "transparent",
          boxShadow: "none",
        },
      }}
    >
      <DialogContent className="bg-[#171C1F] w-full rounded-lg text-white items-center justify-center text-center p-0">
        <div className="w-full max-w-3xl">
          <Swiper
            modules={[Pagination]}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            onSlideChange={() => console.log("slide change")}
            onSwiper={(swiper) => console.log(swiper)}
          >
            <SwiperSlide>
              <TutorialSlide heading="Welcome to marginfi" next="Lending & borrowing">
                Slide 1 content
              </TutorialSlide>
            </SwiperSlide>
            <SwiperSlide>
              <TutorialSlide heading="Lending & borrowing" next="Fees & yield">
                Slide 2 content
              </TutorialSlide>
            </SwiperSlide>
            <SwiperSlide>
              <TutorialSlide heading="Fees & yield" next="Account health">
                Slide 3 content
              </TutorialSlide>
            </SwiperSlide>
            <SwiperSlide>
              <TutorialSlide heading="Account health">Slide 4 content</TutorialSlide>
            </SwiperSlide>
          </Swiper>
        </div>
        <CloseIcon className="absolute top-4 right-4 cursor-pointer z-20 opacity-75" onClick={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
