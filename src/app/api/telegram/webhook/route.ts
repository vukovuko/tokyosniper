import { getCheapestFlight } from "@/src/lib/services/flights";
import { getCheapestStays } from "@/src/lib/services/stays";
import {
  sendTelegramMessage,
  formatFlightAlert,
  formatStayAlert,
} from "@/src/lib/services/telegram";
import { formatPrice } from "@/src/lib/currency";
import { redis } from "@/src/lib/cache";

interface TelegramUpdate {
  message?: {
    text?: string;
    chat?: { id: number };
  };
}

export async function POST(req: Request) {
  const update = (await req.json()) as TelegramUpdate;
  const text = update.message?.text?.trim();

  if (!text || !text.startsWith("/")) {
    return Response.json({ ok: true });
  }

  const command = text.split(" ")[0].toLowerCase();

  switch (command) {
    case "/cheapest": {
      const flight = await getCheapestFlight();
      const stays = await getCheapestStays(1);

      let msg = "📊 <b>Current Cheapest</b>\n\n";

      if (flight) {
        msg += `✈️ Flight: ${flight.origin}→${flight.destination}\n`;
        msg += `💰 ${formatPrice(flight.priceEurCents, "EUR")} | ${flight.airline || "N/A"}\n`;
        msg += `📅 ${flight.departureDate}\n\n`;
      } else {
        msg += "✈️ No flight data yet\n\n";
      }

      if (stays.length > 0) {
        const s = stays[0];
        msg += `🏨 Stay: ${s.name}\n`;
        msg += `💰 ${formatPrice(s.pricePerNightUsdCents, "USD")}/night | ${s.neighborhood}\n`;
        msg += `⭐ ${s.rating ?? "N/A"} | ${s.platform}\n`;
      } else {
        msg += "🏨 No stay data yet\n";
      }

      await sendTelegramMessage(msg);
      break;
    }

    case "/flights": {
      const flights = [];
      for (const dest of ["NRT", "HND"]) {
        const f = await getCheapestFlight(dest);
        if (f) flights.push(f);
      }

      if (flights.length === 0) {
        await sendTelegramMessage("No flight data yet.");
        break;
      }

      let msg = "✈️ <b>Cheapest Flights</b>\n\n";
      for (const f of flights) {
        msg += `${f.origin}→${f.destination}: ${formatPrice(f.priceEurCents, "EUR")}`;
        if (f.airline) msg += ` (${f.airline})`;
        msg += `\n📅 ${f.departureDate} | ${f.stops ?? 0} stops\n\n`;
      }

      await sendTelegramMessage(msg);
      break;
    }

    case "/stays": {
      const stays = await getCheapestStays(5);

      if (stays.length === 0) {
        await sendTelegramMessage("No stay data yet.");
        break;
      }

      let msg = "🏨 <b>Top 5 Cheapest Stays</b>\n\n";
      for (const s of stays) {
        msg += `<b>${s.name}</b>\n`;
        msg += `${formatPrice(s.pricePerNightUsdCents, "USD")}/night | ${s.neighborhood} | ${s.platform}\n`;
        if (s.rating) msg += `⭐ ${s.rating}`;
        msg += `\n\n`;
      }

      await sendTelegramMessage(msg);
      break;
    }

    case "/status": {
      let lastFlightRun = "Never";
      let lastStayRun = "Never";
      try {
        const fr = await redis.get<number>("cron:flights:lastRun");
        if (fr) lastFlightRun = new Date(fr).toISOString();
        const sr = await redis.get<number>("cron:stays:lastRun");
        if (sr) lastStayRun = new Date(sr).toISOString();
      } catch {
        // Redis unavailable
      }

      const msg =
        `📊 <b>Status</b>\n\n` +
        `✈️ Last flight check: ${lastFlightRun}\n` +
        `🏨 Last stay check: ${lastStayRun}\n` +
        `\n⏰ Flights: every 6h | Stays: every 12h`;

      await sendTelegramMessage(msg);
      break;
    }

    default:
      await sendTelegramMessage(
        "Available commands: /cheapest /flights /stays /status",
      );
  }

  return Response.json({ ok: true });
}
