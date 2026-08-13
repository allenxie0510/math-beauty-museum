import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const hometownExhibitions = sqliteTable("hometown_exhibitions", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  ownerEmail: text("owner_email").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  schoolClass: text("school_class").notNull().default(""),
  locationLabel: text("location_label").notNull().default(""),
  visibility: text("visibility").notNull().default("unpublished"),
  coverAssetId: text("cover_asset_id"),
  manifestVersion: integer("manifest_version").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_hometown_exhibitions_slug").on(table.slug),
  index("idx_hometown_exhibitions_owner_updated").on(table.ownerId, table.updatedAt),
]);

export const hometownAssets = sqliteTable("hometown_assets", {
  id: text("id").primaryKey(),
  exhibitionId: text("exhibition_id").notNull(),
  ownerId: text("owner_id").notNull(),
  objectKey: text("object_key").notNull(),
  thumbnailKey: text("thumbnail_key").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  status: text("status").notNull().default("UPLOADED"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_hometown_assets_exhibition").on(table.exhibitionId, table.createdAt),
]);

export const hometownExhibits = sqliteTable("hometown_exhibits", {
  id: text("id").primaryKey(),
  exhibitionId: text("exhibition_id").notNull(),
  assetId: text("asset_id").notNull(),
  zoneId: text("zone_id").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  title: text("title").notNull().default("等待发现"),
  conceptId: text("concept_id"),
  interpretation: text("interpretation").notNull().default(""),
  evidence: text("evidence").notNull().default(""),
  learningJson: text("learning_json").notNull().default("{}"),
  overlayJson: text("overlay_json").notNull().default("{}"),
  candidatesJson: text("candidates_json").notNull().default("[]"),
  teacherConfirmed: integer("teacher_confirmed", { mode: "boolean" }).notNull().default(false),
  rejected: integer("rejected", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_hometown_exhibits_asset").on(table.assetId),
  index("idx_hometown_exhibits_exhibition_order").on(table.exhibitionId, table.zoneId, table.orderIndex),
]);

export const hometownZones = sqliteTable("hometown_zones", {
  id: text("id").primaryKey(),
  exhibitionId: text("exhibition_id").notNull(),
  name: text("name").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  orderIndex: integer("order_index").notNull().default(0),
}, (table) => [
  index("idx_hometown_zones_exhibition_order").on(table.exhibitionId, table.orderIndex),
]);

export const hometownPublishedManifests = sqliteTable("hometown_published_manifests", {
  id: text("id").primaryKey(),
  exhibitionId: text("exhibition_id").notNull(),
  slug: text("slug").notNull(),
  version: integer("version").notNull(),
  manifestJson: text("manifest_json").notNull(),
  publishedAt: text("published_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_hometown_manifests_exhibition_version").on(table.exhibitionId, table.version),
  index("idx_hometown_manifests_slug_version").on(table.slug, table.version),
]);
