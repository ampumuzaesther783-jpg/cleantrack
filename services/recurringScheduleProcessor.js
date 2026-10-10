const pool = require("../config/db");
const { createNotification } = require("../utils/notificationService");

const addDays = (dateValue, days) => {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const getUgandaDateTime = () => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Kampala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}:${values.second}`
  };
};

const isDue = (schedule, today, currentTime) => {
  const nextPickupDate = String(schedule.next_pickup_date).slice(0, 10);
  return nextPickupDate < today || (nextPickupDate === today && schedule.preferred_time <= currentTime);
};

const processDueSchedules = async () => {
  const { date: today, time: currentTime } = getUgandaDateTime();
  const [dueSchedules] = await pool.query(
    `SELECT id FROM recurring_pickup_schedules
     WHERE status = 'active'
       AND (next_pickup_date < ? OR
            (next_pickup_date = ? AND preferred_time <= ?))
     ORDER BY next_pickup_date, preferred_time
     LIMIT 100`,
    [today, today, currentTime]
  );

  for (const { id } of dueSchedules) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[schedule]] = await connection.query(
        `SELECT *, DATE_FORMAT(next_pickup_date, '%Y-%m-%d') AS next_pickup_date
         FROM recurring_pickup_schedules
         WHERE id = ?
         FOR UPDATE`,
        [id]
      );

      if (!schedule || schedule.status !== "active" || !isDue(schedule, today, currentTime)) {
        await connection.commit();
        continue;
      }

      const [[existingOccurrence]] = await connection.query(
        "SELECT pickup_request_id FROM recurring_pickup_occurrences WHERE schedule_id = ? AND occurrence_date = ?",
        [schedule.id, schedule.next_pickup_date]
      );

      if (!existingOccurrence) {
        const [pickup] = await connection.query(
          `INSERT INTO pickup_requests
           (customer_id, location_id, waste_category_id, description, urgency, estimated_bin_level, scheduled_for)
           VALUES (?, ?, ?, ?, 'normal', 80, ?)` ,
          [
            schedule.customer_id,
            schedule.location_id,
            schedule.waste_category_id,
            `Generated from recurring pickup schedule #${schedule.id}`,
            `${schedule.next_pickup_date} ${schedule.preferred_time}`
          ]
        );

        await connection.query(
          `INSERT INTO recurring_pickup_occurrences (schedule_id, occurrence_date, pickup_request_id)
           VALUES (?, ?, ?)`,
          [schedule.id, schedule.next_pickup_date, pickup.insertId]
        );
        await createNotification(
          connection,
          schedule.customer_id,
          "Recurring pickup generated",
          `Pickup #${pickup.insertId} was created from your recurring schedule.`
        );
      }

      const intervalDays = schedule.frequency === "biweekly" ? 14 : 7;
      await connection.query(
        "UPDATE recurring_pickup_schedules SET next_pickup_date = ? WHERE id = ?",
        [addDays(schedule.next_pickup_date, intervalDays), schedule.id]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error(`Could not process recurring schedule ${id}:`, error.message);
    } finally {
      connection.release();
    }
  }
};

const startRecurringScheduleProcessor = () => {
  let isRunning = false;
  const run = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await processDueSchedules();
    } catch (error) {
      console.error("Recurring schedule processor failed:", error.message);
    } finally {
      isRunning = false;
    }
  };

  run();
  const timer = setInterval(run, 60 * 1000);
  timer.unref();
};

module.exports = { processDueSchedules, startRecurringScheduleProcessor, isDue, addDays };
