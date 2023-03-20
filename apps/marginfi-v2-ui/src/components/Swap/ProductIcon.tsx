import React from 'react';
import { styled } from '@mui/system';

interface ProductIconProps {
  product: string;
}

const IconCircle = styled('div')(({ theme }) => ({
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  backgroundColor: theme.palette.grey[900],
  border: '2px solid lightgray',
  position: 'absolute',
  top: '-24px',
  left: 'calc(50% - 24px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
}));

const ProductIcon: React.FC<ProductIconProps> = ({ product }) => {
  const iconPath = `/icons/${product.toLowerCase()}.png`;

  return (
    <IconCircle>
      <img src={iconPath} alt={product} style={{ width: '24px' }} />
    </IconCircle>
  );
};

export default ProductIcon;
