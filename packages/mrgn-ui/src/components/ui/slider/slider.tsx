import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import Lottie from "lottie-react";

import { cn, blendHexColors } from "@mrgnlabs/mrgn-utils";
import fireAnimation from "./fire-lottie.json";
import fireEmodeAnimation from "./fire-emode-lottie.json";

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  emode?: boolean;
}

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, emode = false, ...props }, ref) => {
    const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
      return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    };

    const progress = React.useMemo(() => {
      if (!props.value || !props.max) return 0;
      const val = mapRange(props.value[0], props.min || 0, props.max, 0, 100);

      if (val < 0) return 0;
      return val;
    }, [props.value, props.max, props.min]);

    const scale = React.useMemo(() => {
      if (!props.value || !props.max) return 0;
      const val = mapRange(props.value[0], props.max * 0.3, props.max, 0, 0.75);

      if (val < 0) return 0;
      return val;
    }, [props.value, props.max]);

    const opacity = React.useMemo(() => {
      if (!props.value || !props.max) return 0;
      const val = mapRange(props.value[0], props.max * 0.4, props.max, 0, 0.7);

      if (val < 0) return 0;
      return val;
    }, [props.value, props.max]);

    const colorFrom = emode ? "#E1C8FF" : "#75ba81";

    const toGradient = React.useMemo(() => {
      const colorTo = emode ? "#5F2D89" : "#B686F4";
      const colorFrom = emode ? "#E1C8FF" : "#DCE85D";
      return blendHexColors(colorFrom, colorTo, progress);
    }, [progress, emode]);

    return (
      <SliderPrimitive.Root
        ref={ref}
        className={cn("relative flex w-full touch-none select-none items-center", className)}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/50">
          <SliderPrimitive.Range
            className="absolute h-full transition-colors"
            style={{ backgroundImage: `linear-gradient(to right, ${colorFrom}, ${toGradient})` }}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
          <Lottie
            animationData={emode ? fireEmodeAnimation : fireAnimation}
            className="w-20 absolute left-1/2 origin-bottom"
            style={{
              transform: `translateX(-50%) translateY(-75.5%) scale(${scale})`,
              opacity,
            }}
          />
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Root>
    );
  }
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
