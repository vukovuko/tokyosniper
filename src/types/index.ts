import { z } from "zod/v4";

export const FlightResultSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  departureDate: z.string(),
  returnDate: z.string().optional(),
  airline: z.string().optional(),
  priceEurCents: z.number().int(),
  priceUsdCents: z.number().int(),
  priceRsdCents: z.number().int(),
  source: z.string(),
  stops: z.number().int().default(0),
  durationMinutes: z.number().int().optional(),
  bookingUrl: z.string().optional(),
  rawData: z.unknown().optional(),
});
export type FlightResult = z.infer<typeof FlightResultSchema>;

export const StayResultSchema = z.object({
  name: z.string(),
  neighborhood: z.string(),
  platform: z.string(),
  url: z.string().optional(),
  propertyType: z.string().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().int().optional(),
  amenities: z.array(z.string()).optional(),
  pricePerNightEurCents: z.number().int(),
  pricePerNightUsdCents: z.number().int(),
  pricePerNightRsdCents: z.number().int(),
  pricePerNightJpyCents: z.number().int(),
  totalPriceUsdCents: z.number().int().optional(),
  checkIn: z.string(),
  checkOut: z.string(),
  source: z.string(),
  rawData: z.unknown().optional(),
});
export type StayResult = z.infer<typeof StayResultSchema>;

export interface ScraperResult<T> {
  success: boolean;
  data: T[];
  source: string;
  error?: string;
}

export type Currency = "EUR" | "USD" | "RSD" | "JPY";

export interface PriceMultiCurrency {
  eurCents: number;
  usdCents: number;
  rsdCents: number;
  jpyCents?: number;
}
