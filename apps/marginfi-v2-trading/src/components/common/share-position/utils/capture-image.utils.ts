import { toPng } from "html-to-image";

export const generateImage = async (element: HTMLElement | null) => {
  if (!element) return null;
  try {
    const dataUrl = await toPng(element, {
      cacheBust: true,
      quality: 1,
      pixelRatio: 2,
    });
    return dataUrl;
  } catch (err) {
    console.error("Error generating image:", err);
    return null;
  }
};

export const copyImage = async (dataUrl: string, isMobile: boolean, onCopySuccess?: () => void) => {
  try {
    const blob = await fetch(dataUrl).then((res) => res.blob());

    if (!isMobile && navigator.clipboard) {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      onCopySuccess?.();
    }

    if (isMobile && navigator.share) {
      await navigator.share({
        title: "Check out my trade!",
        text: "My trade position and PnL",
        files: [new File([blob], "trade.png", { type: "image/png" })],
      });
    }
  } catch (err) {
    console.error("Error copying/sharing image:", err);
  }
};

export const downloadImage = (dataUrl: string, tokenSymbol: string, onDownloadSuccess?: () => void) => {
  const timestamp = new Date().toISOString().split("T")[0];
  const link = document.createElement("a");
  link.download = `marginfi-${tokenSymbol.toLowerCase()}-position-${timestamp}.png`;
  link.href = dataUrl;
  link.click();
  onDownloadSuccess?.();
};
