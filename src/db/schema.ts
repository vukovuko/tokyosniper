import {
  pgTable,
  serial,
  varchar,
  integer,
  real,
  text,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const flightPrices = pgTable(
  "flight_prices",
  {
    id: serial("id").primaryKey(),
    origin: varchar("origin", { length: 3 }).notNull(),
    destination: varchar("destination", { length: 3 }).notNull(),
    departureDate: date("departure_date").notNull(),
    returnDate: date("return_date"),
    airline: varchar("airline", { length: 200 }),
    priceEurCents: integer("price_eur_cents").notNull(),
    priceUsdCents: integer("price_usd_cents").notNull(),
    priceRsdCents: integer("price_rsd_cents").notNull(),
    source: varchar("source", { length: 30 }).notNull(),
    stops: integer("stops").default(0),
    durationMinutes: integer("duration_minutes"),
    bookingUrl: text("booking_url"),
    rawData: jsonb("raw_data"),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
  },
  (table) => [
    index("flight_dest_date_idx").on(
      table.destination,
      table.departureDate,
      table.checkedAt,
    ),
    index("flight_price_idx").on(table.priceEurCents),
  ],
);

export const accommodations = pgTable("accommodations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 300 }).notNull(),
  neighborhood: varchar("neighborhood", { length: 50 }).notNull(),
  platform: varchar("platform", { length: 30 }).notNull(),
  url: text("url"),
  propertyType: varchar("property_type", { length: 50 }),
  rating: real("rating"),
  reviewCount: integer("review_count"),
  amenities: jsonb("amenities"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accommodationPrices = pgTable(
  "accommodation_prices",
  {
    id: serial("id").primaryKey(),
    accommodationId: integer("accommodation_id")
      .references(() => accommodations.id)
      .notNull(),
    pricePerNightEurCents: integer("price_per_night_eur_cents").notNull(),
    pricePerNightUsdCents: integer("price_per_night_usd_cents").notNull(),
    pricePerNightRsdCents: integer("price_per_night_rsd_cents").notNull(),
    pricePerNightJpyCents: integer("price_per_night_jpy_cents").notNull(),
    totalPriceUsdCents: integer("total_price_usd_cents"),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    source: varchar("source", { length: 30 }).notNull(),
    rawData: jsonb("raw_data"),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
  },
  (table) => [
    index("acc_price_lookup_idx").on(table.accommodationId, table.checkedAt),
  ],
);

export const alertConfigs = pgTable("alert_configs", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 10 }).notNull(),
  label: varchar("label", { length: 200 }).notNull(),
  thresholdCents: integer("threshold_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const alertHistory = pgTable("alert_history", {
  id: serial("id").primaryKey(),
  alertConfigId: integer("alert_config_id").references(() => alertConfigs.id),
  type: varchar("type", { length: 10 }).notNull(),
  message: text("message").notNull(),
  priceCents: integer("price_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});
