type TradePageProps = {
  params: {
    token: string;
  };
};

export default function TradTokenePage({ params }: TradePageProps) {
  return <div>Trading {params.token}</div>;
}
