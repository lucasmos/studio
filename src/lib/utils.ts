import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { TradingInstrument } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInstrumentDecimalPlaces(instrument: TradingInstrument): number {
  switch (instrument) {
    // Forex
    case 'EUR/USD':
    case 'GBP/USD':
      return 5; // Deriv typically uses 5 for major FX pairs
    // Crypto
    case 'BTC/USD':
    case 'ETH/USD':
      return 2;
    // Commodities
    case 'XAU/USD': // Gold
      return 2;
    // Volatility Indices
    case 'Volatility 10 Index':
      return 3; // Example, verify specific index
    case 'Volatility 25 Index':
      return 3; // Example, verify specific index
    case 'Volatility 50 Index':
      return 2; // Example, verify specific index
    case 'Volatility 75 Index':
      return 4; // Example, verify specific index (often has more decimals)
    case 'Volatility 100 Index':
      return 2; // Example, verify specific index
    default:
      // This should ideally not be reached if TradingInstrument type is exhaustive.
      // Making sure this function is never called with an invalid instrument (exhaustive check)
      const exhaustiveCheck: never = instrument; 
      console.warn(`Unhandled instrument in getInstrumentDecimalPlaces: ${exhaustiveCheck}. Defaulting to 2 decimal places.`);
      return 2; // A general fallback
  }
}
