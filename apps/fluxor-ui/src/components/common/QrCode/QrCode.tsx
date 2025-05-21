import QRCodeStyling from "qr-code-styling";
import type {
  DrawType,
  TypeNumber,
  Mode,
  ErrorCorrectionLevel,
  DotType,
  CornerSquareType,
  CornerDotType,
} from "qr-code-styling";
import { useEffect, useRef } from "react";

interface QrCodeProps {
  value: string;
}

const initOptions = {
  width: 512,
  height: 512,
  type: "canvas" as DrawType,
  qrOptions: {
    typeNumber: 0 as TypeNumber,
    mode: "Byte" as Mode,
    errorCorrectionLevel: "H" as ErrorCorrectionLevel,
  },
  dotsOptions: {
    color: "#000",
    type: "dots" as DotType,
  },
  backgroundOptions: {
    color: "#ffffff",
  },
  cornersSquareOptions: {
    color: "#000",
    type: "extra-rounded" as CornerSquareType,
  },
  cornersDotOptions: {
    color: "#000",
    type: "dot" as CornerDotType,
  },
};

function QrCode(props: QrCodeProps) {
  const qrCodeContainer = useRef<HTMLDivElement | null>(null);

  const op = {
    ...initOptions,
    data: props.value,
  };
  useEffect(() => {
    if (!qrCodeContainer.current) return;
    const code = new QRCodeStyling(op);
    qrCodeContainer.current.innerHTML = "";
    code.append(qrCodeContainer.current);
  });

  return (
    <div className="relative w-full h-full p-[1px]">
      <div className="qrcode-container w-full h-full" ref={qrCodeContainer}></div>
    </div>
  );
}

export { QrCode };
