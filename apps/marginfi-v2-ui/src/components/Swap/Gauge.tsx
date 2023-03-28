const HalfCircularGauge = ({ percentage }: { percentage: number }) => {
  const viewBox = "0 0 100 50";
  const radius = 45;
  const cx = 50;
  const cy = 50 + 10;
  const startAngle = -167;
  const endAngle = -13;
  const needleWidth = 2;
  const gaugeColor = `rgb(${255 * (1 - percentage / 100) + 100}, ${(255 * percentage) / 100 + 100}, 100)`;
  const needleColor = "#DCE85D";

  // calculate the angle of the needle based on the percentage
  const angle = startAngle + (endAngle - startAngle) * (percentage / 100);

  // calculate the coordinates of the needle tip
  const x = cx + radius * Math.cos((angle * Math.PI) / 180);
  const y = cy + radius * Math.sin((angle * Math.PI) / 180);

  return (
    <svg viewBox={viewBox} className="absolute h-[100px] w-[200px] left-[-68px] bottom-[32px] z-[-1]">
      <path
        d={`M ${cx - radius}, ${cy} A ${radius}, ${radius} 0 0 1 ${cx + radius}, ${cy}`}
        stroke={gaugeColor}
        strokeWidth={10}
        fill="none"
      />
      <path
        d={`M ${cx}, ${cy - 10} L ${x}, ${y}`}
        stroke={needleColor}
        strokeWidth={needleWidth}
        strokeLinecap="round"
      />
    </svg>
  );
};

export { HalfCircularGauge };
