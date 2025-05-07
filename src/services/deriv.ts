/**
 * Represents a tick data point for a financial instrument.
 */
export interface Tick {
  /**
   * The epoch timestamp of the tick.
   */
  epoch: number;
  /**
   * The price of the instrument at the time of the tick.
   */
  price: number;
}

/**
 * Asynchronously retrieves tick data for a given symbol.
 *
 * @param symbol The symbol for which to retrieve tick data.
 * @returns A promise that resolves to an array of Tick objects.
 */
export async function getTicks(symbol: string): Promise<Tick[]> {
  // TODO: Implement this by calling the Deriv API.

  return [
    {
      epoch: Date.now() / 1000,
      price: 1.2345,
    },
  ];
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
export async function getOrderBookDepth(symbol: string): Promise<OrderBookDepth> {
  // TODO: Implement this by calling the Deriv API.

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
