/**
 * Generate a Skyscanner search URL for a flight
 * Skyscanner format: /transport/flights/{origin}/{destination}/{YYMMDD}/{YYMMDD}/
 */
export function generateGoogleFlightsUrl(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
): string {
  // Convert YYYY-MM-DD to YYMMDD
  const formatDate = (date: string) => date.replace(/-/g, "").slice(2);

  const depFormatted = formatDate(departureDate);
  const base = `https://www.skyscanner.net/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${depFormatted}`;

  if (returnDate) {
    const retFormatted = formatDate(returnDate);
    return `${base}/${retFormatted}/`;
  }
  return `${base}/`;
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
