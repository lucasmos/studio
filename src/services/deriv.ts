import WebSocket from 'ws';
import type { TradingInstrument } from '@/types';

// Deriv WebSocket API endpoint
const DERIV_WS_URL = 'wss://ws.binaryws.com/websockets/v3?app_id=36906'; // Using a common test app_id

/**
 * Represents a tick data point for a financial instrument.
 */
export interface Tick {
  /**
   * The epoch timestamp (in seconds) of the tick.
   */
  epoch: number;
  /**
   * The price of the instrument at the time of the tick.
   */
  price: number;
  /**
   * Formatted time string for display on the chart.
   */
  time: string;
}

/**
 * Maps user-friendly instrument names to Deriv API symbols.
 */
const instrumentToDerivSymbol = (instrument: TradingInstrument): string => {
  switch (instrument) {
    case 'EUR/USD':
      return 'frxEURUSD';
    case 'GBP/USD':
      return 'frxGBPUSD';
    case 'BTC/USD':
      return 'cryBTCUSD';
    default:
      console.warn(`Unknown instrument: ${instrument}, defaulting to R_100`);
      return 'R_100'; // A default Volatility Index
  }
};

/**
 * Asynchronously retrieves tick data for a given symbol from Deriv API.
 *
 * @param instrument The trading instrument for which to retrieve tick data.
 * @returns A promise that resolves to an array of Tick objects.
 */
export async function getTicks(instrument: TradingInstrument): Promise<Tick[]> {
  const derivSymbol = instrumentToDerivSymbol(instrument);
  const apiToken = process.env.DERIV_API_TOKEN;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(DERIV_WS_URL);
    let requestSent = false;

    const timeout = setTimeout(() => {
      if (ws.readyState !== ws.CLOSED) {
        ws.terminate(); // Close the WebSocket connection if it's still open
      }
      reject(new Error(`Deriv API request timed out for ${derivSymbol}`));
    }, 15000); // 15 seconds timeout

    ws.onopen = () => {
      console.log(`Deriv WebSocket connected for ${derivSymbol}.`);
      if (apiToken) {
        ws.send(JSON.stringify({ authorize: apiToken }));
      } else {
        // If no token, directly request ticks
        sendTicksRequest();
      }
    };

    const sendTicksRequest = () => {
      if (requestSent) return;
      ws.send(
        JSON.stringify({
          ticks_history: derivSymbol,
          end: 'latest',
          count: 50, // Fetch last 50 ticks for the chart
          style: 'ticks',
          subscribe: 0, // We want a one-off response, not a subscription
        })
      );
      requestSent = true;
      console.log(`Sent ticks_history request for ${derivSymbol}`);
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data.toString());
        // console.log('Deriv API Response:', JSON.stringify(response, null, 2));

        if (response.error) {
          console.error(`Deriv API Error for ${derivSymbol}:`, response.error.message);
          reject(new Error(`Deriv API Error for ${derivSymbol}: ${response.error.message}`));
          ws.close();
          return;
        }

        if (response.msg_type === 'authorize') {
          if (response.authorize) {
            console.log('Deriv API Authorized successfully.');
            sendTicksRequest();
          } else {
            console.error('Deriv API Authorization failed.');
            reject(new Error('Deriv API Authorization failed.'));
            ws.close();
          }
          return;
        }
        
        if (response.msg_type === 'history' && response.history) {
          const { times, prices } = response.history;
          if (times && prices && times.length === prices.length) {
            const ticks: Tick[] = times.map((epoch: number, index: number) => ({
              epoch,
              price: prices[index],
              time: new Date(epoch * 1000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false // Use 24-hour format for consistency
              }),
            }));
            resolve(ticks);
          } else {
            console.error('Deriv API ticks_history response format error for', derivSymbol, response);
            reject(new Error(`Invalid data format in ticks_history response for ${derivSymbol}`));
          }
          ws.close();
        } else if (response.echo_req && response.echo_req.ticks_history && !response.history) {
            // This can happen if the symbol has no recent ticks or is invalid
            console.warn(`No history data returned for ${derivSymbol}. Echo_req:`, response.echo_req);
            resolve([]); // Resolve with empty array if no history
            ws.close();
        }

      } catch (parseError) {
        console.error(`Error parsing Deriv API response for ${derivSymbol}:`, parseError);
        reject(new Error(`Error parsing Deriv API response for ${derivSymbol}`));
        ws.close();
      }
    };

    ws.onerror = (error) => {
      console.error(`Deriv WebSocket error for ${derivSymbol}:`, error.message);
      reject(new Error(`Deriv WebSocket error for ${derivSymbol}: ${error.message}`));
      ws.close(); // Ensure close on error
    };

    ws.onclose = (event) => {
      clearTimeout(timeout);
      console.log(`Deriv WebSocket disconnected for ${derivSymbol}. Code: ${event.code}, Reason: ${event.reason}`);
      // If the promise hasn't been resolved or rejected yet, it might mean an unexpected closure.
      // However, normal closure after resolve/reject is fine.
    };
  });
}

/**
 * Represents the order book depth for a financial instrument.
 */
export interface OrderBookDepth {
  /**
   * The asks (sell orders) in the order book.
   */
  asks: Array<[number, number]>;
  /**
   * The bids (buy orders) in the order book.
   */
  bids: Array<[number, number]>;
}

/**
 * Asynchronously retrieves the order book depth for a given symbol.
 *
 * @param symbol The symbol for which to retrieve the order book depth.
 * @returns A promise that resolves to an OrderBookDepth object.
 */
export async function getOrderBookDepth(instrument: TradingInstrument): Promise<OrderBookDepth> {
  // TODO: Implement this by calling the Deriv API for order book data.
  // This would also likely use WebSockets.
  console.warn(`getOrderBookDepth for ${instrument} is not yet implemented with real API.`);
  return {
    asks: [
      [1.2346, 10],
      [1.2347, 20],
    ],
    bids: [
      [1.2344, 15],
      [1.2343, 25],
    ],
  };
}