import React from 'react';

interface ProductIconProps {
  product: string;
}

const ProductIcon: React.FC<ProductIconProps> = ({ product }) => {
  const iconPath = `/icons/${product.toLowerCase()}.png`;

  return (
    <div className="w-12 h-12 bg-[#0E1113] border-2 border-[#1C2125] rounded-full absolute top-[-24px] left-[calc(50%-24px)] flex justify-center items-center">
      <img src={iconPath} alt={product} className="w-6" />
    </div>
  );
};

export default ProductIcon;
