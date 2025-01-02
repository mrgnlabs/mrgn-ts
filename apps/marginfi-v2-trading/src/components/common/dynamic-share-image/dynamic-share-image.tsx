/* eslint-disable @next/next/no-img-element */
export function DynamicShareImage({
  tokenSymbol,
  tokenImageUrl,
}: {
  tokenSymbol: string | null;
  tokenImageUrl: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "960px",
        height: "500px",
        backgroundColor: "#F7F7F7",
        backgroundImage: "url('https://staging.thearena.trade/sharing/share-position-bg.png')",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        position: "relative",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "80px",
          height: "80px",
          overflow: "hidden",
          marginBottom: "20px",
          display: "flex",
        }}
      >
        <img
          src={tokenImageUrl ?? ""}
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
      </div>

      <h1
        style={{
          fontSize: "32px",
          fontWeight: "bold",
          margin: 0,
        }}
      >
        Trade {tokenSymbol}
      </h1>

      <h1
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          margin: 0,
        }}
      >
        The Arena
      </h1>

      <p
        style={{
          fontSize: "16px",
          color: "#666",
          marginTop: "5px",
        }}
      >
        Memecoin trading, with leverage.
      </p>
    </div>
  );
}

// export function DynamicShareImage({
//   tokenImageUrl,
//   quoteImageUrl,
//   tokenSymbol,
//   quoteSymbol,
// }: {
//   tokenImageUrl: string;
//   quoteImageUrl: string;
//   tokenSymbol: string;
//   quoteSymbol: string;
// }) {
//   return (
//     <div
//       style={{
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         justifyContent: "center",
//         width: "960px",
//         height: "500px",
//         backgroundColor: "#F7F7F7",
//         backgroundImage: "url('http://localhost:3006/sharing/share-position-bg.png')",
//         backgroundRepeat: "no-repeat",
//         backgroundSize: "cover",
//         position: "relative",
//         fontFamily: "Arial, sans-serif",
//       }}
//     >
//       <div
//         style={{
//           width: "84px",
//           height: "84px",
//           overflow: "hidden",
//           marginBottom: "20px",
//           padding: "2px",
//           display: "flex",
//         }}
//       >
//         <img
//           src={tokenImageUrl}
//           alt="Profile"
//           height="80px"
//           width="80px"
//           style={{
//             borderRadius: "50%",
//             objectFit: "cover",
//             position: "absolute",
//             height: "80px",
//             width: "80px",
//           }}
//         />
//         <img
//           src={quoteImageUrl}
//           alt="Profile"
//           height="30px"
//           width="30px"
//           style={{
//             height: "30px",
//             width: "30px",
//             borderRadius: "50%",
//             objectFit: "cover",
//             position: "absolute",
//             bottom: "0",
//             right: "0",
//           }}
//         />
//       </div>

//       <h1
//         style={{
//           fontSize: "32px",
//           fontWeight: "bold",
//           margin: 0,
//         }}
//       >
//         {tokenSymbol}/{quoteSymbol}
//       </h1>

//       <h1
//         style={{
//           fontSize: "24px",
//           fontWeight: "bold",
//           margin: 0,
//         }}
//       >
//         The Arena
//       </h1>

//       <p
//         style={{
//           fontSize: "16px",
//           color: "#666",
//           marginTop: "5px",
//         }}
//       >
//         Memecoin trading, with leverage.
//       </p>
//     </div>
//   );
// }
