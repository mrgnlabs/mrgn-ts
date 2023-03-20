import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import Needle from './Needle';

interface HealthFactorGaugeProps {
  healthFactor: number;
}

const HealthFactorGauge: React.FC<HealthFactorGaugeProps> = ({ healthFactor }) => {
  const gaugeColor = `rgb(${255 * (1 - healthFactor / 100) + 100}, ${255 * healthFactor / 100 + 100}, 100)`;
  // const rotation = (healthFactor / 100) * 180;
  const rotation = 130;

  return (
    <div className="z-0 w-[200px] h-[200px] relative">
      <CircularProgressbar
        value={healthFactor}
        maxValue={100}
        strokeWidth={10}
        styles={buildStyles({
          strokeLinecap: 'butt',
          textSize: '14px',
          pathColor: gaugeColor,
          trailColor: gaugeColor,
        })}
        counterClockwise
      />
      <Needle rotation={rotation} />
    </div>
  );
};

export default HealthFactorGauge;
