import React from 'react';

interface NeedleProps {
  rotation: number;
}

const Needle: React.FC<NeedleProps> = ({ rotation }) => {
  const maxLength = 125;
  const minLength = 92;
  const scaleFactor = (maxLength - minLength) / 2;

  const angleFactor = Math.sin(rotation * (Math.PI / 180))
  const needleWidth = minLength + angleFactor * scaleFactor;

  const circleRadius = maxLength;
  const hypotenuse = circleRadius * angleFactor;
  const adjustedNeedleWidth = Math.sqrt(Math.abs(needleWidth * needleWidth - hypotenuse * hypotenuse) + ((Math.abs(90 - rotation) / 90) * 30));

  return (
    <div
      className="absolute rounded-xl h-[4px] bg-[#DCE85D] top-[50%] left-[50%] transition-all duration-300 ease-in-out"
      style={{
        width: `${adjustedNeedleWidth}px`,
        transformOrigin: '100% 50%',
        transform: `translate(-100%, -1000%) rotate(${rotation}deg)`,
      }}
    ></div>
  );
};

export default Needle;
