import React from 'react';

const Arrow = () => (
  <div className='w-[75px] h-[75px] flex justify-center items-center'>
    <svg width="75" height="75" viewBox="0 0 75 75">
      <line x1="0" y1="37.5" x2="67.5" y2="37.5" stroke="white" strokeWidth="2" markerEnd="url(#arrowhead)" />
      <defs>
        <marker id="arrowhead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="white" />
        </marker>
      </defs>
    </svg>
  </div>
)

const Rectangle = ({ text, border }) => (
  <div className='w-[150px] h-[75px] text-sm flex justify-center items-center p-2' style={{ border: border}}>
    { text }
  </div>
)

const PositionDiagram = ({
  type
}) => {
  return (
    <div className='flex flex-col w-3/5 text-sm gap-2 text-[gray]'>
    <div>{`${type} position`}</div>
    <div className='flex w-full justify-between gap-2 text-white'>
      <Rectangle text="Deposit 1 mSOL" border="dotted yellow 1px" />
      <Arrow />
      <Rectangle text="Borrow 0.7 SOL" border="solid rgb(75,75,75) 1px"/>
      <Arrow />
      <Rectangle text="Swap SOL to mSOL + Deposit" border="solid rgb(75,75,75) 1px" />
      <Arrow />
      <Rectangle text="⚡️ 1 mSOL" border="dotted yellow 1px" />
    </div>
    </div>
  );
};

export { PositionDiagram };
