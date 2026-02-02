import type { Currency, PriceMultiCurrency } from "@/src/types";
import { redis } from "./cache";

const RATES_CACHE_KEY = "currency:rates";
const RATES_TTL = 3600 * 6; // 6 hours

interface ExchangeRates {
  EUR: number;
  USD: number;
  RSD: number;
  JPY: number;
}

const FALLBACK_RATES: ExchangeRates = {
  EUR: 1,
  USD: 1.08,
  RSD: 117.5,
  JPY: 163.0,
};

export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    const cached = await redis.get<ExchangeRates>(RATES_CACHE_KEY);
    if (cached) return cached;
  } catch {
    // Redis unavailable, continue to fetch
  }

  try {
    const res = await fetch(
      "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,JPY",
    );
    const data = (await res.json()) as { rates: { USD: number; JPY: number } };

    // Frankfurter doesn't support RSD, use fallback ratio
    const rates: ExchangeRates = {
      EUR: 1,
      USD: data.rates.USD,
      JPY: data.rates.JPY,
      RSD: FALLBACK_RATES.RSD,
    };

    try {
      await redis.set(RATES_CACHE_KEY, rates, { ex: RATES_TTL });
    } catch {
      // Redis write failed, continue
    }

    return rates;
  } catch {
    return FALLBACK_RATES as ExchangeRates;
  }
}

export async function convertToAllCurrencies(
  amountCents: number,
  from: Currency,
): Promise<PriceMultiCurrency> {
  const rates = await getExchangeRates();
  const eurCents = Math.round(amountCents / rates[from]);

  return {
    eurCents,
    usdCents: Math.round(eurCents * rates.USD),
    rsdCents: Math.round(eurCents * rates.RSD),
    jpyCents: Math.round(eurCents * rates.JPY),
  };
}

export function formatPrice(cents: number, currency: Currency): string {
  const amount = cents / 100;
  const symbols: Record<Currency, string> = {
    EUR: "€",
    USD: "$",
    RSD: "RSD ",
    JPY: "¥",
  };
  if (currency === "JPY") {
    return `${symbols[currency]}${Math.round(amount).toLocaleString()}`;
  }
  return `${symbols[currency]}${amount.toFixed(2)}`;
}
