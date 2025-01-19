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
        backgroundImage: `url('${baseUrl}/metadata/metadata-image-bg.png')`,
        backgroundSize: "cover",
        position: "relative",
        fontFamily: "Orbitron",
      }}
    >
      <div
        style={{
          width: "105px",
          height: "105px",
          overflow: "hidden",
          marginBottom: "12px",
          padding: "2px",
          display: "flex",
        }}
      >
        <img
          src={tokenImageUrl}
          alt="Profile"
          height="100px"
          width="100px"
          style={{
            borderRadius: "50%",
            objectFit: "cover",
            position: "absolute",
            height: "100px",
            width: "100px",
            border: "1px solid black",
          }}
        />
        <img
          src={quoteTokenImageUrl}
          alt="Profile"
          height="40px"
          width="40px"
          style={{
            height: "40px",
            width: "40px",
            borderRadius: "50%",
            objectFit: "cover",
            position: "absolute",
            bottom: "0",
            right: "0",
            border: "1px solid black",
          }}
        />
      </div>

      <h1
        style={{
          fontSize: "38px",
          fontWeight: "bold",
          margin: 0,
        }}
      >
        {tokenSymbol} / {quoteTokenSymbol}
      </h1>
    </div>
  );
}
