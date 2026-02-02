import { getCheapestFlight } from "@/src/lib/services/flights";
import { getCheapestStays } from "@/src/lib/services/stays";
import {
  sendTelegramMessage,
  formatDailyDigest,
} from "@/src/lib/services/telegram";

export const maxDuration = 30;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [cheapestNrt, cheapestHnd, stays] = await Promise.all([
    getCheapestFlight("NRT"),
    getCheapestFlight("HND"),
    getCheapestStays(5),
  ]);

  const msg = formatDailyDigest({
    cheapestNrt,
    cheapestHnd,
    stays,
  });

  const sent = await sendTelegramMessage(msg);

  return Response.json({
    sent,
    timestamp: new Date().toISOString(),
  });
}
