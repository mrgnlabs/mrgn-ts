/* eslint-disable @next/next/no-img-element */

export function DynamicShareImage({
  tokenImageUrl,
  quoteTokenImageUrl,
  tokenSymbol,
  quoteTokenSymbol,
  baseUrl,
}: {
  tokenImageUrl: string;
  quoteTokenImageUrl: string;
  tokenSymbol: string;
  quoteTokenSymbol: string;
  baseUrl: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "720px",
        height: "360px",
        backgroundColor: "#F7F7F7",
        backgroundImage: `url('${baseUrl}/metadata/metadata-image-bg.png')`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        position: "relative",
        fontFamily: "var(--font-aeonik)",
      }}
    >
      <div
        style={{
          width: "84px",
          height: "84px",
          overflow: "hidden",
          marginBottom: "20px",
          padding: "2px",
          display: "flex",
        }}
      >
        <img
          src={tokenImageUrl}
          alt="Profile"
          height="80px"
          width="80px"
          style={{
            borderRadius: "50%",
            objectFit: "cover",
            position: "absolute",
            height: "80px",
            width: "80px",
          }}
        />
        <img
          src={quoteTokenImageUrl}
          alt="Profile"
          height="30px"
          width="30px"
          style={{
            height: "30px",
            width: "30px",
            borderRadius: "50%",
            objectFit: "cover",
            position: "absolute",
            bottom: "0",
            right: "0",
          }}
        />
      </div>

      <h1
        style={{
          fontSize: "32px",
          fontWeight: "bold",
          margin: 0,
          fontFamily: "var(--font-aeonik)",
        }}
      >
        {tokenSymbol}/{quoteTokenSymbol}
      </h1>
    </div>
  );
}
