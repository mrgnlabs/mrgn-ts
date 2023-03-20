import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

interface HealthFactorGaugeProps {
  healthFactor: number;
}

const HealthFactorGauge: React.FC<HealthFactorGaugeProps> = ({ healthFactor }) => {
  const gaugeColor = healthFactor >= 100 ? 'green' : healthFactor <= 0 ? 'red' : `rgb(${255 * (1 - healthFactor / 100)}, ${255 * healthFactor / 100}, 0)`;

  return (
    <div className="w-full relative pb-[50%] z-10">
      <CircularProgressbar
        value={healthFactor}
        maxValue={100}
        text={`${Math.round(healthFactor)}%`}
        strokeWidth={4}
        styles={buildStyles({
          strokeLinecap: 'butt',
          textSize: '14px',
          textColor: gaugeColor,
          pathColor: gaugeColor,
          trailColor: 'transparent',
        })}
        counterClockwise
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  );
};

export default HealthFactorGauge;
