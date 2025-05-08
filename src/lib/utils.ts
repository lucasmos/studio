import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { TradingInstrument } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInstrumentDecimalPlaces(instrument: TradingInstrument): number {
  switch (instrument) {
    case 'BTC/USD':
    case 'ETH/USD':
    // case 'SOL/USD': // Removed as symbol is invalid
    case 'XAU/USD':
      return 2;
    case 'EUR/USD':
    case 'GBP/USD':
      return 5; // Deriv typically uses 5 for major FX pairs
    default:
      // This should ideally not be reached if TradingInstrument type is exhaustive.
      // Making sure this function is never called with an invalid instrument (exhaustive check)
      const exhaustiveCheck: never = instrument; 
      console.error(`Unhandled instrument in getInstrumentDecimalPlaces: ${exhaustiveCheck}`);
      return 4; // A general fallback
  }
}

