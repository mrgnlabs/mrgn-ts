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
  width: 280,
  height: 280,
  type: "canvas" as DrawType,
  qrOptions: {
    typeNumber: 0 as TypeNumber,
    mode: "Byte" as Mode,
    errorCorrectionLevel: "H" as ErrorCorrectionLevel,
  },
  dotsOptions: {
    color: "#000000",
    type: "rounded" as DotType,
  },
  backgroundOptions: {
    color: "#ffffff",
  },
  cornersSquareOptions: {
    color: "#000000",
    type: "extra-rounded" as CornerSquareType,
  },
  cornersDotOptions: {
    color: "#000000",
    type: "dot" as CornerDotType,
  },
  imageOptions: {
    hideBackgroundDots: true,
    imageSize: 0.4,
    margin: 0,
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
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="qrcode-container" ref={qrCodeContainer}></div>
    </div>
  );
}

export { QrCode };
