import React from 'react';

interface Token {
  value: string;
  label: string;
  image: string;
  borderColor?: string;
}

interface InputBoxProps {
  tokens: Token[];
  label: string;
  showMaxButton?: boolean;
}

const InputBox: React.FC<InputBoxProps> = ({ tokens, label, showMaxButton = true }) => {
  const [selectedToken, setSelectedToken] = React.useState(tokens[0]);

  const handleTokenChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const selectedValue = event.target.value as string;
    setSelectedToken(tokens.find((token) => token.value === selectedValue) || tokens[0]);
  };

  return (
    <div className="w-full bg-[#4C4C4E] rounded p-2">
      <label className="block text-[#e1e1e1]">{label}</label>
      <div className="flex items-center border-[2px] border-[#1C2125] bg-[#0E1113] p-1 rounded">
        <img src={selectedToken.image} alt={selectedToken.label} className="w-6 mr-2" />
        <input className="flex-grow text-[#e1e1e1] bg-transparent outline-none" />
        {showMaxButton && (
          <button className="bg-white text-[#0E1113] text-xs rounded mr-2 py-0.5 px-1">MAX</button>
        )}
        <select
          value={selectedToken.value}
          onChange={handleTokenChange}
          className={`text-[#e1e1e1] bg-[#1C2125] border-[2px] border-${selectedToken.borderColor || '#e1e1e1'} p-1 rounded`}
        >
          {tokens.map((token) => (
            <option key={token.value} value={token.value}>
              {token.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default InputBox;
