CREATE TABLE `hometown_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`exhibition_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`object_key` text NOT NULL,
	`thumbnail_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`status` text DEFAULT 'UPLOADED' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_hometown_assets_exhibition` ON `hometown_assets` (`exhibition_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `hometown_exhibitions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`school_class` text DEFAULT '' NOT NULL,
	`location_label` text DEFAULT '' NOT NULL,
	`visibility` text DEFAULT 'unpublished' NOT NULL,
	`cover_asset_id` text,
	`manifest_version` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hometown_exhibitions_slug` ON `hometown_exhibitions` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_hometown_exhibitions_owner_updated` ON `hometown_exhibitions` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `hometown_exhibits` (
	`id` text PRIMARY KEY NOT NULL,
	`exhibition_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`zone_id` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`title` text DEFAULT '等待发现' NOT NULL,
	`concept_id` text,
	`interpretation` text DEFAULT '' NOT NULL,
	`evidence` text DEFAULT '' NOT NULL,
	`overlay_json` text DEFAULT '{}' NOT NULL,
	`candidates_json` text DEFAULT '[]' NOT NULL,
	`teacher_confirmed` integer DEFAULT false NOT NULL,
	`rejected` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hometown_exhibits_asset` ON `hometown_exhibits` (`asset_id`);--> statement-breakpoint
CREATE INDEX `idx_hometown_exhibits_exhibition_order` ON `hometown_exhibits` (`exhibition_id`,`zone_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `hometown_published_manifests` (
	`id` text PRIMARY KEY NOT NULL,
	`exhibition_id` text NOT NULL,
	`slug` text NOT NULL,
	`version` integer NOT NULL,
	`manifest_json` text NOT NULL,
	`published_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hometown_manifests_exhibition_version` ON `hometown_published_manifests` (`exhibition_id`,`version`);--> statement-breakpoint
CREATE INDEX `idx_hometown_manifests_slug_version` ON `hometown_published_manifests` (`slug`,`version`);--> statement-breakpoint
CREATE TABLE `hometown_zones` (
	`id` text PRIMARY KEY NOT NULL,
	`exhibition_id` text NOT NULL,
	`name` text NOT NULL,
	`subtitle` text DEFAULT '' NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_hometown_zones_exhibition_order` ON `hometown_zones` (`exhibition_id`,`order_index`);