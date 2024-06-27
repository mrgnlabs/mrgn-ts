// Define a type for the callback function
type OnRealtimeCallback = (data: any) => void;

// Store interval IDs to manage subscriptions
const intervals: Map<string, NodeJS.Timeout> = new Map();

export function subscribeOnStream(
  symbolInfo: any,
  resolution: string,
  onRealtimeCallback: OnRealtimeCallback,
  lastBar: any
) {
  const address = symbolInfo.address;

  // Clear any existing interval for this address
  if (intervals.has(address)) {
    clearInterval(intervals.get(address) as NodeJS.Timeout);
  }

  // Fetch data and invoke the callback
  const fetchData = async () => {
    try {
      const response = await fetch(`/api/datafeed?action=fetchData&address=${address}&resolution=${resolution}`);
      const data = await response.json();

      // Assuming data contains the latest bar information
      onRealtimeCallback(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Fetch data immediately and then set up periodic fetching every 5 minutes
  fetchData();
  const intervalId = setInterval(fetchData, 5 * 60 * 1000);

  // Store the interval ID to manage it later
  intervals.set(address, intervalId);
}

export function unsubscribeFromStream(symbolInfo: any) {
  const address = symbolInfo.address;

  // Clear the interval for this address
  if (intervals.has(address)) {
    clearInterval(intervals.get(address) as NodeJS.Timeout);
    intervals.delete(address);
  }
}
