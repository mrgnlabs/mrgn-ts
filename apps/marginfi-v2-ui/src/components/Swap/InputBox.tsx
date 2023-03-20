import React from 'react';
import { FormControl, InputLabel, OutlinedInput, InputAdornment, Select, MenuItem } from '@mui/material';
import { styled } from '@mui/system';

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

const StyledInputLabel = styled(InputLabel)({
  color: 'white',
});

const StyledOutlinedInput = styled(OutlinedInput)({
  color: 'white',
});

const InputBox: React.FC<InputBoxProps> = ({ tokens, label, showMaxButton = true }) => {
  const [selectedToken, setSelectedToken] = React.useState(tokens[0]);

  const handleTokenChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const selectedValue = event.target.value as string;
    setSelectedToken(tokens.find((token) => token.value === selectedValue) || tokens[0]);
  };

  return (
    <FormControl fullWidth variant="outlined" sx={{ backgroundColor: '#4C4C4E', borderRadius: 1 }}>
      <StyledInputLabel>{label}</StyledInputLabel>
      <StyledOutlinedInput
        startAdornment={
          <InputAdornment position="start">
            <img src={selectedToken.image} alt={selectedToken.label} style={{ width: '24px', marginRight: '8px' }} />
          </InputAdornment>
        }
        endAdornment={
          <InputAdornment position="end">
            {showMaxButton && <button style={{ backgroundColor: 'white', marginRight: '8px', fontSize: '12px' }}>MAX</button>}
            <Select
              value={selectedToken.value}
              onChange={handleTokenChange}
              sx={{
                color: 'white',
                backgroundColor: '#2C2C2E',
                borderRadius: 1,
                borderColor: selectedToken.borderColor || 'white',
              }}
            >
              {tokens.map((token) => (
                <MenuItem key={token.value} value={token.value}>
                  {token.label}
                </MenuItem>
              ))}
            </Select>
          </InputAdornment>
        }
        label={label}
        sx={{
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: selectedToken.borderColor || 'white',
          },
        }}
      />
    </FormControl>
  );
};

export default InputBox;
