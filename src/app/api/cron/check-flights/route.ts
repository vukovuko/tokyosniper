import { fetchAndStoreFlights } from "@/src/lib/services/flights";
import { checkFlightAlerts } from "@/src/lib/services/alerts";
import { invalidateKeys } from "@/src/lib/cache";
import { redis } from "@/src/lib/cache";

export const maxDuration = 60;

const DEDUP_KEY = "cron:flights:lastRun";
const DEDUP_TTL = 300; // 5 minutes

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: skip if ran within last 5 minutes
  try {
    const lastRun = await redis.get(DEDUP_KEY);
    if (lastRun) {
      return Response.json({ skipped: true, reason: "Rate limited" });
    }
    await redis.set(DEDUP_KEY, Date.now(), { ex: DEDUP_TTL });
  } catch {
    // Redis unavailable, proceed anyway
  }

  const result = await fetchAndStoreFlights();

  // Check alerts with the newly found flights
  const alertResult = await checkFlightAlerts(result.flights);

  // Invalidate dashboard cache
  await invalidateKeys("dashboard:*", "flights:*");

  return Response.json({
    ...result,
    alertsSent: alertResult.alertsSent,
    timestamp: new Date().toISOString(),
  });
}
