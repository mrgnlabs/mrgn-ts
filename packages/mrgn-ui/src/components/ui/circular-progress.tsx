import * as React from "react";
import { cn } from "@mrgnlabs/mrgn-utils";
import * as ProgressPrimitive from "@radix-ui/react-progress";

interface CircularProgressProps extends React.ComponentPropsWithoutRef<"div"> {
  value: number; // Progress value from 0 to 100
  size?: number; // Size of the progress circle
  strokeWidth?: number; // Thickness of the progress stroke
  strokeColor?: string; // Color of the progress stroke
  backgroundColor?: string; // Color of the background circle
}

const CircularProgress = React.forwardRef<React.ElementRef<"div">, CircularProgressProps>(
  (
    {
      className,
      value,
      size = 40,
      strokeWidth = 4,
      strokeColor = "stroke-[#0a0a0a]",
      backgroundColor = "stroke-[#0a0a0a]",
      ...props
    },
    ref
  ) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
      <div ref={ref} className={cn("relative ", className)} {...props}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            className={backgroundColor}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("transition-all", strokeColor)}
          />
        </svg>
      </div>
    );
  }
);

CircularProgress.displayName = "CircularProgress";

export { CircularProgress };
