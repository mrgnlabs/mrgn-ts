import React from 'react';
import { Grid, Paper, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { styled } from '@mui/system';
import InputBox from '~/components/Swap/InputBox';
import ProductIcon from '~/components/Swap/ProductIcon';
import HealthFactorGauge from '~/components/Swap/HealthFactorGauge';

interface Token {
  value: string;
  label: string;
  image: string;
  borderColor?: string;
}

interface SwapUIProps {
  tokens: Token[];
  healthFactor: number;
}

const CustomPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.grey[900],
}));

const SwapUI: React.FC<SwapUIProps> = ({ tokens, healthFactor }) => {
  const [selectedAction, setSelectedAction] = React.useState('Lend');

  const handleActionChange = (
    event: React.MouseEvent<HTMLElement>,
    newAction: string | null,
  ) => {
    if (newAction) setSelectedAction(newAction);
  };

  const inputBoxLabel = selectedAction === 'Borrow' ? 'Lend' : selectedAction;

  return (
    <CustomPaper elevation={2} sx={{ p: 2, mt: 2, width: '100%', position: 'relative' }}>
      <HealthFactorGauge healthFactor={healthFactor} />
      <ToggleButtonGroup
        value={selectedAction}
        exclusive
        onChange={handleActionChange}
        sx={{ justifyContent: 'center', display: 'block', marginBottom: 2 }}
      >
        <ToggleButton value="Lend">Lend</ToggleButton>
        <ToggleButton value="Borrow">Borrow</ToggleButton>
        <ToggleButton value="Lock">Lock</ToggleButton>
        <ToggleButton value="Superstake">Superstake</ToggleButton>
      </ToggleButtonGroup>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <InputBox tokens={tokens} label={inputBoxLabel} />
        </Grid>
        {selectedAction === 'Borrow' && (
          <Grid item xs={12}>
            <InputBox tokens={tokens} label="Borrow" />
          </Grid>
        )}
        <Grid item xs={12} container justifyContent="center">
          <ProductIcon product={selectedAction} />
        </Grid>
        <Grid item xs={12} container justifyContent="center">
          <button style={{ backgroundColor: 'gray', color: 'white' }}>
            {selectedAction}
          </button>
        </Grid>
      </Grid>
    </CustomPaper>
  );
};

export default SwapUI;
