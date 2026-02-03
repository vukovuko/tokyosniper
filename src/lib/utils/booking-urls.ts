/**
 * Generate a Skyscanner search URL for a flight
 * Uses official Skyscanner format: /transport/flights/{origin}/{destination}/{date}/{returnDate}/
 * Docs: https://developers.skyscanner.net/docs/referrals/flights-parameters
 */
export function generateGoogleFlightsUrl(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
): string {
  const base = `https://www.skyscanner.net/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${departureDate}`;

  if (returnDate) {
    return `${base}/${returnDate}/?adults=1&cabinclass=economy`;
  }
  return `${base}/?adults=1&cabinclass=economy`;
}

/**
 * Generate a Skyscanner search URL for a flight
 */
export function generateSkyscannerUrl(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
): string {
  // Format: https://www.skyscanner.com/transport/flights/beg/nrt/250315/250325/
  const depFormatted = departureDate.replace(/-/g, "").slice(2); // "2025-03-15" → "250315"
  const retFormatted = returnDate?.replace(/-/g, "").slice(2) || "";

  const path = returnDate
    ? `${origin.toLowerCase()}/${destination.toLowerCase()}/${depFormatted}/${retFormatted}/`
    : `${origin.toLowerCase()}/${destination.toLowerCase()}/${depFormatted}/`;

  return `https://www.skyscanner.com/transport/flights/${path}`;
}
