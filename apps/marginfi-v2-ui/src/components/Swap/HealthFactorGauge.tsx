import React from 'react';
import GaugeChart from './GaugeChart';

interface HealthFactorGaugeProps {
  healthFactor: number;
}

const HealthFactorGauge: React.FC<HealthFactorGaugeProps> = ({ healthFactor }) => {
  const gaugeColor = `rgb(${255 * (1 - healthFactor / 100) + 100}, ${255 * healthFactor / 100 + 100}, 100)`;

  return (
    <div className="z-0 w-[250px] h-[250px] relative">
      <GaugeChart
        id="gauge-chart3" 
        nrOfLevels={1} 
        colors={[gaugeColor]} 
        arcWidth={0.25} 
        percent={healthFactor} 
        needleColor="#DCE85D"
        needleBaseColor="#DCE85D"
        hideText
      />
    </div>
  );
};

export { HealthFactorGauge };
