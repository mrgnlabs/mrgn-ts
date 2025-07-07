"use client";

import { useRef, useState, useEffect, useCallback, type RefObject } from "react";
import { useDebounce } from "@uidotdev/usehooks";

// Types for the hook
type ElementRef = RefObject<HTMLElement>;
type RefPair = [ElementRef, ElementRef];
type LineCoordinates = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  // Add a type to determine the path style
  pathType: "straight" | "down" | "up";
  // Add path length for animation calculations
  pathLength: number;
  // Add index for offset calculations
  index: number;
};

// Define a type for line colors
type LineColor = {
  base: string;
  pulse: string;
};

type LineConnectionOptions = {
  color?: string;
  pulseColor?: string;
  pulseSpeed?: number;
  strokeWidth?: number;
  pulseWidth?: number;
  cornerRadius?: number;
  lineSpacing?: number;
  // New option for line colors
  colors?: LineColor[];
  // Option to use different colors for each line
  useUniqueColors?: boolean;
};

// Default options
const defaultOptions: LineConnectionOptions = {
  color: "rgba(147, 51, 234, 0.3)", // Light purple
  pulseColor: "rgba(147, 51, 234, 0.8)", // Deeper purple
  pulseSpeed: 3, // seconds
  strokeWidth: 2,
  pulseWidth: 3,
  cornerRadius: 10,
  lineSpacing: 30, // Spacing between parallel lines
  useUniqueColors: true, // Default to using unique colors
};

/**
 * A hook that creates animated connecting lines between pairs of elements
 * @param refPairs Array of ref pairs to connect with lines
 * @param options Customization options for the lines
 * @param highlightedIndices Array of indices of the highlighted lines (or undefined/null)
 * @returns JSX element with SVG lines
 */
export function useEmodeLineConnections(
  refPairs: RefPair[],
  options: LineConnectionOptions = {},
  highlightedIndices?: number[]
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineCoordinates, setLineCoordinates] = useState<LineCoordinates[]>([]);

  // Store previous coordinates to compare
  const prevCoordinatesRef = useRef<LineCoordinates[]>([]);

  // Calculate the approximate path length
  const calculatePathLength = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    pathType: "straight" | "down" | "up"
  ): number => {
    if (pathType === "straight") {
      // For straight lines, it's just the horizontal distance
      return Math.abs(x2 - x1);
    } else {
      // For curved paths, we approximate the length
      // Horizontal segments + vertical segment + a bit extra for the curves
      const horizontalDistance = Math.abs(x2 - x1);
      const verticalDistance = Math.abs(y2 - y1);
      return horizontalDistance + verticalDistance;
    }
  };

  // Memoize the calculation function to prevent recreation on each render
  const calculateLineCoordinates = useCallback(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();

    const newCoordinates = refPairs.map(([startRef, endRef], index) => {
      // Skip if either ref is null or doesn't have a current element
      if (!startRef?.current || !endRef?.current) {
        return { x1: 0, y1: 0, x2: 0, y2: 0, pathType: "straight" as const, pathLength: 0, index };
      }

      const startRect = startRef.current.getBoundingClientRect();
      const endRect = endRef.current.getBoundingClientRect();

      // Calculate positions relative to the container
      const x1 = startRect.right - containerRect.left;
      const y1 = startRect.top + startRect.height / 2 - containerRect.top;
      const x2 = endRect.left - containerRect.left;
      const y2 = endRect.top + endRect.height / 2 - containerRect.top;

      // Determine the path type based on the relative positions
      let pathType: "straight" | "down" | "up" = "down";

      // If the elements are roughly on the same row (within a small threshold)
      const sameRowThreshold = 20; // pixels
      if (Math.abs(y1 - y2) < sameRowThreshold) {
        pathType = "straight";
      } else if (y2 < y1) {
        // If the end element is above the start element
        pathType = "up";
      }

      // Calculate the approximate path length
      const pathLength = calculatePathLength(x1, y1, x2, y2, pathType);

      return { x1, y1, x2, y2, pathType, pathLength, index };
    });

    // Only update state if coordinates have changed
    if (JSON.stringify(newCoordinates) !== JSON.stringify(prevCoordinatesRef.current)) {
      prevCoordinatesRef.current = newCoordinates;
      setLineCoordinates(newCoordinates);
    }
  }, [refPairs]);

  // Create debounced version of the calculation function
  const debouncedCalculate = useDebounce(calculateLineCoordinates, 100);

  useEffect(() => {
    // Initial calculation
    calculateLineCoordinates();

    // Add resize listener
    window.addEventListener("resize", debouncedCalculate);

    // Set up a mutation observer to detect DOM changes
    const observer = new MutationObserver(calculateLineCoordinates);
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    }

    // Clean up
    return () => {
      window.removeEventListener("resize", debouncedCalculate);
      observer.disconnect();
    };
  }, [calculateLineCoordinates, debouncedCalculate]);

  // Generate path string for a line based on the path type
  const getPathString = useCallback(
    (
      coords: LineCoordinates,
      cornerRadius: number,
      lineSpacing: number,
      totalConnections: number,
      numCurvedConnections?: number
    ) => {
      const { x1, y1, x2, y2, pathType, index } = coords;
      const radius = cornerRadius || 10;

      // For straight lines (elements on the same row)
      if (pathType === "straight") {
        // Use L for straight lines, no y2 offset (truly straight)
        return `M ${x1},${y1} L ${x2},${y2}`;
      }

      // Calculate the horizontal distance
      const horizontalDistance = x2 - x1;

      // If there's only one curve, always center it (even if there are other straight lines)
      if (numCurvedConnections === 1) {
        const midX = x1 + horizontalDistance / 2;

        // For lines going down (start element is above end element)
        if (pathType === "down") {
          return `M ${x1},${y1} 
                H ${midX - radius} 
                Q ${midX},${y1} ${midX},${y1 + radius}
                V ${y2 - radius} 
                Q ${midX},${y2} ${midX + radius},${y2}
                H ${x2}`;
        }

        // For lines going up (start element is below end element)
        if (pathType === "up") {
          return `M ${x1},${y1} 
                H ${midX - radius} 
                Q ${midX},${y1} ${midX},${y1 - radius}
                V ${y2 + radius} 
                Q ${midX},${y2} ${midX + radius},${y2}
                H ${x2}`;
        }
      }

      // Calculate the base position (0 to 1) for this connection
      // This implements the "always take the half point" approach
      let position = 0.5; // Default to center for the first connection

      if (totalConnections > 1) {
        // This implements the "always take the half point" logic
        // by using the binary representation of the index to determine position
        const binaryPos = (index + 1).toString(2).substring(1);
        let currentLeft = 0;
        let currentRight = 1;

        for (let i = 0; i < binaryPos.length; i++) {
          const mid = (currentLeft + currentRight) / 2;
          if (binaryPos[i] === "1") {
            currentLeft = mid;
          } else {
            currentRight = mid;
          }
        }
        position = (currentLeft + currentRight) / 2;
      }

      // Apply some spacing between lines
      const spacing = 0.1; // Adjust this value to control spacing between lines
      const effectiveSpacing = spacing / Math.max(1, totalConnections - 1);
      position = position * (1 - effectiveSpacing * 2) + effectiveSpacing;

      // Calculate the midpoint
      const midX = x1 + horizontalDistance * position;

      // For lines going down (start element is above end element)
      if (pathType === "down") {
        return `M ${x1},${y1} 
              H ${midX - radius} 
              Q ${midX},${y1} ${midX},${y1 + radius}
              V ${y2 - radius} 
              Q ${midX},${y2} ${midX + radius},${y2}
              H ${x2}`;
      }

      // For lines going up (start element is below end element)
      if (pathType === "up") {
        return `M ${x1},${y1} 
              H ${midX - radius} 
              Q ${midX},${y1} ${midX},${y1 - radius}
              V ${y2 + radius} 
              Q ${midX},${y2} ${midX + radius},${y2}
              H ${x2}`;
      }

      // Default fallback
      return `M ${x1},${y1} H ${x2}`;
    },
    []
  );

  // Component to render the SVG lines
  const LineConnectionSvg = useCallback(() => {
    const mergedOptions = { ...defaultOptions, ...options };
    const { lineSpacing = defaultOptions.lineSpacing } = mergedOptions;
    const totalConnections = lineCoordinates.length;
    const numCurvedConnections = lineCoordinates.filter((l) => l.pathType !== "straight").length;
    // Expanded color palette for better readability
    const colorPalette = mergedOptions.colors || [
      { base: "hsl(252 100% 70%)", pulse: "hsl(252 100% 96%)" }, // New brand color with double lightness
      { base: "hsl(262 95% 67%)", pulse: "hsl(262 95% 94%)" }, // Slightly shifted hue, reduced saturation
      { base: "hsl(242 90% 63%)", pulse: "hsl(242 90% 88%)" }, // More blue-shifted, reduced saturation
      { base: "hsl(272 85% 65%)", pulse: "hsl(272 85% 90%)" }, // More magenta-shifted, reduced saturation
      { base: "hsl(232 80% 59%)", pulse: "hsl(232 80% 86%)" }, // Even more blue, reduced saturation and lightness
      { base: "hsl(282 75% 61%)", pulse: "hsl(282 75% 86%)" }, // More purple, reduced saturation and lightness
    ];

    // Helper: is this line highlighted?
    const isLineHighlighted = (idx: number) => {
      if (!highlightedIndices || highlightedIndices.length === 0) return null;
      return highlightedIndices.includes(idx);
    };

    return (
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-10" style={{ overflow: "visible" }}>
        <defs>
          {/* No blur filters */}
          {/* Add tightly-mapped gradient for each pulse (length = pulseLength) */}
          {lineCoordinates.map((coords, idx) => {
            const pulseLength = 80;
            // We'll use the direction of the path's start and end for x1/y1/x2/y2
            // For simplicity, use the start and end points of the path
            const { x1, y1, x2, y2 } = coords;
            return (
              <linearGradient
                key={`gradient-${idx}`}
                id={`gradient-${idx}`}
                gradientUnits="userSpaceOnUse"
                x1={x1}
                y1={y1}
                x2={x1 + (x2 - x1) * (pulseLength / Math.max(1, Math.abs(x2 - x1)))}
                y2={y1 + (y2 - y1) * (pulseLength / Math.max(1, Math.abs(y2 - y1)))}
              >
                <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                <stop offset="30%" stopColor={colorPalette[idx % colorPalette.length].pulse} stopOpacity="1" />
                <stop offset="100%" stopColor={colorPalette[idx % colorPalette.length].base} stopOpacity="0" />
              </linearGradient>
            );
          })}
          {/* Add a linearGradient for each pulse (line color to pulse color) */}
          {lineCoordinates.map((coords, idx) => {
            const { x1, y1, x2, y2 } = coords;
            const lineColorObj = colorPalette[idx % colorPalette.length];
            return (
              <linearGradient
                key={`pulse-gradient-${idx}`}
                id={`pulse-gradient-${idx}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={lineColorObj.base} />
                <stop offset="50%" stopColor={lineColorObj.pulse} />
              </linearGradient>
            );
          })}
        </defs>
        {lineCoordinates.map((coords, idx) => {
          // Get color for this line
          const lineColor = colorPalette[idx % colorPalette.length];
          const highlighted = isLineHighlighted(idx);
          const fadedOpacity = highlightedIndices == null ? 1 : highlighted ? 1 : 0.4;
          const pulseOpacity = highlightedIndices == null ? 1 : highlighted ? 1 : 0.18;
          const pathString = getPathString(
            coords,
            mergedOptions.cornerRadius || 10,
            lineSpacing || 30,
            totalConnections,
            numCurvedConnections
          );
          const pathLength = coords.pathLength || 1;
          const pulseLength = Math.max(10, Math.min(60, pathLength * 0.8));
          const gapLength = Math.max(1, pathLength - pulseLength);

          return (
            <g key={coords.index} style={{ zIndex: highlighted ? 2 : 1 }}>
              <path
                d={pathString}
                stroke={lineColor.base}
                strokeWidth={highlighted ? mergedOptions.strokeWidth || 1.8 : mergedOptions.strokeWidth}
                fill="none"
                opacity={fadedOpacity}
                style={{
                  transition: "opacity 0.5s cubic-bezier(0.4,0,0.2,1), stroke-width 0.3s cubic-bezier(0.4,0,0.2,1)",
                }}
              />
            </g>
          );
        })}
        {/* Render all pulses above all static lines */}
        {lineCoordinates.map((coords, idx) => {
          const pathString = getPathString(
            coords,
            mergedOptions.cornerRadius || 10,
            lineSpacing || 30,
            totalConnections,
            numCurvedConnections
          );
          const pathLength = coords.pathLength || 1;
          const pulseLength = 20;
          const gapLength = Math.max(1, pathLength - pulseLength);
          const highlighted = isLineHighlighted(idx);
          const pulseOpacity = highlightedIndices == null ? 0.5 : highlighted ? 0.5 : 0.1;
          // Unified animated pulse rendering for all lines
          return (
            <path
              key={"pulse-unified-" + coords.index}
              d={pathString}
              stroke={`url(#pulse-gradient-${idx})`}
              strokeWidth={3}
              fill="none"
              opacity={pulseOpacity}
              strokeDasharray={`${pulseLength} ${gapLength}`}
              strokeDashoffset={pathLength}
              style={{ transition: "opacity 0.5s cubic-bezier(0.4,0,0.2,1)" }}
            >
              <animate
                attributeName="stroke-dashoffset"
                from={pathLength}
                to="0"
                dur={`${mergedOptions.pulseSpeed}s`}
                repeatCount="indefinite"
              />
            </path>
          );
        })}
      </svg>
    );
  }, [lineCoordinates, getPathString, options, highlightedIndices]);

  // Recalculate when refPairs change
  useEffect(() => {
    calculateLineCoordinates();
  }, [refPairs, calculateLineCoordinates]);

  return {
    containerRef,
    LineConnectionSvg,
  };
}
