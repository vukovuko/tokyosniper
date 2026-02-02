import { fetchAndStoreStays } from "@/src/lib/services/stays";
import { checkStayAlerts } from "@/src/lib/services/alerts";
import { invalidateKeys } from "@/src/lib/cache";
import { redis } from "@/src/lib/cache";

export const maxDuration = 60;

const DEDUP_KEY = "cron:stays:lastRun";
const DEDUP_TTL = 300;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const lastRun = await redis.get(DEDUP_KEY);
    if (lastRun) {
      return Response.json({ skipped: true, reason: "Rate limited" });
    }
    await redis.set(DEDUP_KEY, Date.now(), { ex: DEDUP_TTL });
  } catch {
    // Redis unavailable, proceed
  }

  const result = await fetchAndStoreStays();
  const alertResult = await checkStayAlerts([]);

  await invalidateKeys("dashboard:*", "stays:*");

  return Response.json({
    ...result,
    alertsSent: alertResult.alertsSent,
    timestamp: new Date().toISOString(),
  });
}
