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
    case 'SOL/USD':
    case 'XAU/USD':
      return 2;
    case 'EUR/USD':
    case 'GBP/USD':
      return 5; // Deriv typically uses 5 for major FX pairs
    default:
      // Fallback for any other instruments, though all current ones are covered.
      // Check if instrument is a string and handle it, or throw error for unexpected type.
      if (typeof instrument === 'string' && instrument.includes('/')) {
        // Basic guess for unlisted forex/crypto
        return instrument.startsWith('frx') ? 5 : 2;
      }
      return 4; // A general fallback
  }
}
