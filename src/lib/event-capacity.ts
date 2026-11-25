import { getDatabase } from "@netlify/database";
import { ReservationError } from "@/lib/event-reservation-service";

export type CapacityRequest = { optionId: string; capacity: number; used: number; quantity: number; baselineAt: number };

function database() {
  try {
    return getDatabase();
  } catch {
    throw new ReservationError("Capacity-limited registration is temporarily unavailable. Please try again later.", 503);
  }
}

export async function reserveEventCapacity(requestKey: string, requested: CapacityRequest[]) {
  const limited = requested.filter((item) => item.capacity > 0);
  if (!limited.length) return;
  const db = database();
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM phase_two_capacity_holds WHERE expires_at <= NOW()");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`event-request:${requestKey}`]);
    const previous = await client.query("SELECT 1 FROM phase_two_capacity_holds WHERE request_key = $1 AND expires_at > NOW() LIMIT 1", [requestKey]);
    if (previous.rowCount) throw new ReservationError("This registration is already being processed. Please wait a moment and try again.", 409);
    const ordered = [...limited].sort((a, b) => a.optionId.localeCompare(b.optionId));
    for (const item of ordered) await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`event-option:${item.optionId}`]);
    const effective: CapacityRequest[] = [];
    for (const item of ordered) {
      const configured = await client.query<{ capacity: number | string }>("SELECT capacity FROM phase_two_capacity_limits WHERE resource_id = $1", [item.optionId]);
      const databaseCapacity = configured.rows[0] ? Number(configured.rows[0].capacity) : item.capacity;
      const capacity = databaseCapacity > 0 ? Math.min(item.capacity, databaseCapacity) : databaseCapacity;
      if (capacity <= 0) continue;
      const held = await client.query<{ quantity: number | string }>(
        "SELECT COALESCE(SUM(quantity), 0) AS quantity FROM phase_two_capacity_holds WHERE option_id = $1 AND request_key <> $2 AND status = 'pending' AND expires_at > NOW() AND (airtable_saved = FALSE OR airtable_saved_at > to_timestamp($3 / 1000.0))",
        [item.optionId, requestKey, item.baselineAt]
      );
      const concurrentHolds = Number(held.rows[0]?.quantity || 0);
      if (item.used + concurrentHolds + item.quantity > capacity) throw new ReservationError("There are not enough spaces left for that quantity. Please choose fewer or remove the option.", 409);
      effective.push(item);
    }
    for (const item of effective) {
      await client.query(
        "INSERT INTO phase_two_capacity_holds (request_key, option_id, quantity, status, airtable_saved, airtable_saved_at, expires_at) VALUES ($1, $2, $3, 'pending', FALSE, NULL, NOW() + INTERVAL '6 hours')",
        [requestKey, item.optionId, item.quantity]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ReservationError) throw error;
    console.error("Atomic event capacity reservation failed", error);
    throw new ReservationError("Capacity-limited registration is temporarily unavailable. Please try again later.", 503);
  } finally {
    client.release();
  }
}

export async function updateCapacityLimit(resourceId: string, capacity: number, used: number, baselineAt: number, updateSource: () => Promise<void>) {
  const db = database();
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM phase_two_capacity_holds WHERE expires_at <= NOW()");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`event-option:${resourceId}`]);
    const held = await client.query<{ quantity: number | string }>(
      "SELECT COALESCE(SUM(quantity), 0) AS quantity FROM phase_two_capacity_holds WHERE option_id = $1 AND status = 'pending' AND expires_at > NOW() AND (airtable_saved = FALSE OR airtable_saved_at > to_timestamp($2 / 1000.0))",
      [resourceId, baselineAt]
    );
    if (capacity > 0 && used + Number(held.rows[0]?.quantity || 0) > capacity) throw new ReservationError("Capacity cannot be reduced below the number of places already held.", 409);
    await updateSource();
    await client.query(
      "INSERT INTO phase_two_capacity_limits (resource_id, capacity, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (resource_id) DO UPDATE SET capacity = EXCLUDED.capacity, updated_at = NOW()",
      [resourceId, capacity]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof ReservationError) throw error;
    console.error("Could not update event capacity limit", error);
    throw new ReservationError("Event capacity could not be updated safely. Please try again.", 503);
  } finally {
    client.release();
  }
}

export async function markEventCapacitySaved(requestKey: string) {
  const db = database();
  await db.sql`UPDATE phase_two_capacity_holds SET airtable_saved = TRUE, airtable_saved_at = NOW() WHERE request_key = ${requestKey}`;
}

export async function releaseEventCapacity(requestKey: string) {
  const db = database();
  await db.sql`DELETE FROM phase_two_capacity_holds WHERE request_key = ${requestKey}`;
}
