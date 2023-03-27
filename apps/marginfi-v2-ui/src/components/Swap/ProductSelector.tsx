import React, { FC, MouseEvent } from "react";
import { ToggleButtonGroup } from "@mui/material";
import CustomToggleButton from "./CustomToggleButton";
import config, { Product } from "~/config";
import { ProductType } from "~/types";

interface ProductSelectorProps {
  selectedProduct: string;
  handleProductChange: (event: MouseEvent<HTMLElement>, newAction: ProductType) => void;
}

const ProductSelector: FC<ProductSelectorProps> = ({ selectedProduct, handleProductChange }) => {
  const handleButtonClick = (event: MouseEvent<HTMLElement>, newSelectedProduct: Product) => {
    handleProductChange(event, newSelectedProduct.type);
  };

  return (
    <div className="relative w-[340px] mx-auto mb-[111px]">
      <ToggleButtonGroup
        value={selectedProduct}
        exclusive
        className="w-full flex justify-between border-[#1C2125] rounded-[30px] bg-[#0D1011] mb-2"
      >
        {Object.keys(config.PRODUCTS_CONFIG).map((optionStr, index, arr) => {
          const option = optionStr as keyof typeof config.PRODUCTS_CONFIG;
          return (
            <CustomToggleButton
              key={config.PRODUCTS_CONFIG[option].type}
              value={config.PRODUCTS_CONFIG[option].type}
              selectedProduct={selectedProduct}
              onClick={(event) => handleButtonClick(event, config.PRODUCTS_CONFIG[option])}
              index={index}
              arr={arr}
            >
              <span className="relative z-10">{config.PRODUCTS_CONFIG[option].type}</span>
            </CustomToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </div>
  );
};

export { ProductSelector };
