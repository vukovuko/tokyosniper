const TELEGRAM_API = "https://api.telegram.org/bot";

function getUrl(method: string): string {
  return `${TELEGRAM_API}${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
}

export async function sendTelegramMessage(
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML",
): Promise<boolean> {
  try {
    const res = await fetch(getUrl("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    console.error("Failed to send Telegram message");
    return false;
  }
}

export function formatFlightAlert(flight: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  airline?: string;
  priceEurCents: number;
  stops: number;
  durationMinutes?: number;
  bookingUrl?: string;
  previousPriceEurCents?: number;
}): string {
  const price = (flight.priceEurCents / 100).toFixed(2);
  const duration = flight.durationMinutes
    ? `${Math.floor(flight.durationMinutes / 60)}h ${flight.durationMinutes % 60}m`
    : "N/A";

  let msg = `✈️ <b>FLIGHT DEAL</b>\n`;
  msg += `${flight.origin} → ${flight.destination}`;
  if (flight.returnDate) msg += ` (round trip)`;
  msg += `\n`;
  msg += `📅 ${flight.departureDate}`;
  if (flight.returnDate) msg += ` – ${flight.returnDate}`;
  msg += `\n`;
  if (flight.airline) msg += `🏢 ${flight.airline}\n`;
  msg += `🔄 ${flight.stops} stop${flight.stops !== 1 ? "s" : ""} | ⏱ ${duration}\n`;
  msg += `💰 <b>€${price}</b>`;
  if (flight.previousPriceEurCents) {
    const prev = (flight.previousPriceEurCents / 100).toFixed(2);
    const drop = (
      ((flight.previousPriceEurCents - flight.priceEurCents) /
        flight.previousPriceEurCents) *
      100
    ).toFixed(0);
    msg += ` (was €${prev}, -${drop}%)`;
  }
  msg += `\n`;
  if (flight.bookingUrl)
    msg += `\n🔗 <a href="${flight.bookingUrl}">Book now</a>`;

  return msg;
}

export function formatStayAlert(stay: {
  name: string;
  neighborhood: string;
  platform: string;
  pricePerNightUsdCents: number;
  rating?: number;
  checkIn: string;
  checkOut: string;
  url?: string;
  previousPriceUsdCents?: number;
}): string {
  const price = (stay.pricePerNightUsdCents / 100).toFixed(2);

  let msg = `🏨 <b>STAY DEAL — ${stay.neighborhood}</b>\n`;
  msg += `${stay.name}\n`;
  msg += `📍 ${stay.platform}`;
  if (stay.rating) msg += ` | ⭐ ${stay.rating}`;
  msg += `\n`;
  msg += `💰 <b>$${price}/night</b>`;
  if (stay.previousPriceUsdCents) {
    const prev = (stay.previousPriceUsdCents / 100).toFixed(2);
    const drop = (
      ((stay.previousPriceUsdCents - stay.pricePerNightUsdCents) /
        stay.previousPriceUsdCents) *
      100
    ).toFixed(0);
    msg += ` (was $${prev}, -${drop}%)`;
  }
  msg += `\n`;
  msg += `📅 ${stay.checkIn} – ${stay.checkOut}\n`;
  if (stay.url) msg += `\n🔗 <a href="${stay.url}">View listing</a>`;

  return msg;
}

export function formatDailyDigest(data: {
  cheapestNrt: {
    priceEurCents: number;
    departureDate: string;
    airline: string | null;
    stops: number | null;
  } | null;
  cheapestHnd: {
    priceEurCents: number;
    departureDate: string;
    airline: string | null;
    stops: number | null;
  } | null;
  stays: {
    name: string;
    neighborhood: string;
    pricePerNightUsdCents: number;
    rating: number | null;
  }[];
}): string {
  let msg = `📊 <b>DAILY DIGEST — TokyoSniper</b>\n\n`;

  msg += `<b>✈️ Cheapest Flights</b>\n`;
  if (data.cheapestNrt) {
    const p = (data.cheapestNrt.priceEurCents / 100).toFixed(2);
    msg += `BUD → NRT: <b>€${p}</b> (${data.cheapestNrt.departureDate}`;
    if (data.cheapestNrt.airline) msg += `, ${data.cheapestNrt.airline}`;
    msg += `, ${data.cheapestNrt.stops ?? 0} stops)\n`;
  } else {
    msg += `BUD → NRT: no data yet\n`;
  }
  if (data.cheapestHnd) {
    const p = (data.cheapestHnd.priceEurCents / 100).toFixed(2);
    msg += `BUD → HND: <b>€${p}</b> (${data.cheapestHnd.departureDate}`;
    if (data.cheapestHnd.airline) msg += `, ${data.cheapestHnd.airline}`;
    msg += `, ${data.cheapestHnd.stops ?? 0} stops)\n`;
  } else {
    msg += `BUD → HND: no data yet\n`;
  }

  msg += `\n<b>🏠 Top 5 Cheapest Stays</b>\n`;
  if (data.stays.length === 0) {
    msg += `No stay data yet\n`;
  } else {
    for (const s of data.stays) {
      const p = (s.pricePerNightUsdCents / 100).toFixed(2);
      msg += `• ${s.name} (${s.neighborhood}) — <b>$${p}/night</b>`;
      if (s.rating) msg += ` ⭐${s.rating}`;
      msg += `\n`;
    }
  }

  return msg;
}
