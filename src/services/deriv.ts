// import WebSocket from 'ws'; // Removed: 'ws' is for Node.js, browser has native WebSocket
import type { TradingInstrument } from '@/types';

// Deriv WebSocket API endpoint
const DERIV_WS_URL = 'wss://ws.binaryws.com/websockets/v3?app_id=74597'; 

// Read the token from environment variables. NEXT_PUBLIC_ prefix makes it available to the browser.
const DERIV_API_TOKEN = "TXQW98UdRF92bo0";


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
    case 'XAU/USD':
      return 'frxXAUUSD'; // Gold vs USD
    case 'ETH/USD':
      return 'cryETHUSD'; // Ethereum vs USD
    case 'Volatility 10 Index':
      return 'R_10';
    case 'Volatility 25 Index':
      return 'R_25';
    case 'Volatility 50 Index':
      return 'R_50';
    case 'Volatility 75 Index':
      return 'R_75';
    case 'Volatility 100 Index':
      return 'R_100';
    default:
      // This should ideally not be reached if TradingInstrument type is exhaustive
      // and all UI elements use instruments from this type.
      // Making sure this function is never called with an invalid instrument (exhaustive check)
      const exhaustiveCheck: never = instrument; 
      console.error(`Unknown instrument passed to instrumentToDerivSymbol: ${exhaustiveCheck}`);
      // Fallback to a commonly available symbol if type safety fails, though this indicates a bug.
      return 'R_100'; // Fallback to a common Volatility Index
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
  
  // Ensure WebSocket is only used in the browser environment
  if (typeof window === 'undefined') {
    console.warn('WebSocket operations (getTicks) are intended for the browser environment and will not run on the server.');
    return Promise.resolve([]); 
  }

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(DERIV_WS_URL); 
    let requestSent = false;
    let authorized = false; // Track authorization status

    const timeout = setTimeout(() => {
      if (ws.readyState !== ws.CLOSED && ws.readyState !== ws.CLOSING) {
        ws.close(); 
      }
      reject(new Error(`Deriv API request timed out for ${derivSymbol}`));
    }, 15000); // 15 seconds timeout

    ws.onopen = () => {
      console.log(`Deriv WebSocket connected for ${derivSymbol}.`);
      if (DERIV_API_TOKEN) {
        console.log('Attempting to authorize with API token.');
        ws.send(JSON.stringify({ authorize: DERIV_API_TOKEN }));
      } else {
        console.warn('Deriv API token is not available. Attempting to fetch public data. This may fail for protected resources like tick history.');
        sendTicksRequest(); // Proceed without authorization if no token
      }
    };

    const sendTicksRequest = () => {
      if (requestSent) return;
      ws.send(
        JSON.stringify({
          ticks_history: derivSymbol,
          end: 'latest',
          count: 50, // Fetch 50 ticks for the chart
          style: 'ticks',
          // subscribe: 1 // Uncomment if you want real-time tick updates, handle 'tick' messages
        })
      );
      requestSent = true;
      console.log(`Sent ticks_history request for ${derivSymbol}`);
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data.toString());
        
        if (response.error) {
          console.error(`Deriv API Error for ${derivSymbol}:`, response.error.message, response.error.code);
          reject(new Error(`Deriv API Error for ${derivSymbol}: ${response.error.message} (Code: ${response.error.code})`));
          ws.close();
          clearTimeout(timeout);
          return;
        }

        if (response.msg_type === 'authorize') {
          if (response.authorize) {
            console.log('Deriv API Authorized successfully.');
            authorized = true;
            sendTicksRequest(); 
          } else {
            console.error('Deriv API Authorization failed. Response:', response);
            // If auth fails but token was provided, it might be invalid.
            // If no token was provided, this path shouldn't be hit based on current logic.
            // We could choose to proceed with public data request or reject.
            // For now, if auth was attempted and failed, we reject.
            if(DERIV_API_TOKEN){
              reject(new Error('Deriv API Authorization failed. Ensure your token is valid and has tick_history permissions.'));
              ws.close();
              clearTimeout(timeout);
              return;
            }
            // If no token was provided, and auth somehow failed (unexpected), try public request
            console.warn('Authorization message received without successful auth, but no token was provided. Proceeding with public request.');
            sendTicksRequest();
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
                hour12: false 
              }),
            }));
            resolve(ticks);
          } else {
            console.error('Deriv API ticks_history response format error for', derivSymbol, response);
            reject(new Error(`Invalid data format in ticks_history response for ${derivSymbol}`));
          }
          ws.close();
          clearTimeout(timeout);
        } else if (response.echo_req && response.echo_req.ticks_history && !response.history) {
            // This can happen if the symbol is valid but has no recent ticks, or if not authorized for a protected symbol
            console.warn(`No history data returned for ${derivSymbol}. This might be due to an invalid symbol, no recent ticks, or insufficient permissions if not authorized. Echo_req:`, response.echo_req);
            resolve([]); 
            ws.close();
            clearTimeout(timeout);
        }
        // Handle 'tick' messages if subscribed
        // if (response.msg_type === 'tick' && response.tick) {
        //   console.log('Received tick update:', response.tick);
        //   // Here you would typically update a real-time chart or data store
        // }


      } catch (parseError) {
        console.error(`Error parsing Deriv API response for ${derivSymbol}:`, parseError);
        reject(new Error(`Error parsing Deriv API response for ${derivSymbol}`));
        ws.close();
        clearTimeout(timeout);
      }
    };

    ws.onerror = (errorEvent) => {
      console.error(`Deriv WebSocket error for ${derivSymbol}. Event:`, errorEvent);
      // Browser WebSocket errors are typically DOMExceptions or generic Events
      if (errorEvent instanceof Event && 'message' in errorEvent) {
         reject(new Error(`Deriv WebSocket connection error for ${derivSymbol}: ${(errorEvent as any).message}. Check network and API endpoint.`));
      } else {
        reject(new Error(`Deriv WebSocket error for ${derivSymbol}. Check network, API endpoint, and console for details.`));
      }
      if (ws.readyState !== ws.CLOSED && ws.readyState !== ws.CLOSING) {
        ws.close();
      }
      clearTimeout(timeout);
    };

    ws.onclose = (event) => {
      clearTimeout(timeout); // Ensure timeout is cleared on close
      console.log(`Deriv WebSocket disconnected for ${derivSymbol}. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
      // If the promise hasn't resolved/rejected yet, it means an unexpected close.
      // This check might be redundant if all paths leading to close also resolve/reject.
      // For safety, one might reject here if not already settled.
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
 * @param instrument The trading instrument for which to retrieve the order book depth.
 * @returns A promise that resolves to an OrderBookDepth object.
 */
export async function getOrderBookDepth(instrument: TradingInstrument): Promise<OrderBookDepth> {
  console.warn(`getOrderBookDepth for ${instrument} is not yet implemented with real API.`);
  // Mock data, replace with actual API call if needed
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

