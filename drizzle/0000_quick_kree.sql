CREATE TABLE `request_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `request_limits_expiry` ON `request_limits` (`expires`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`at` text NOT NULL,
	`module` text NOT NULL,
	`publish` integer DEFAULT 0 NOT NULL,
	`answers` text NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`score` real,
	`time_sec` real,
	`errors` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_id_unique` ON `reviews` (`id`);--> statement-breakpoint
CREATE INDEX `reviews_public_order` ON `reviews` (`publish`,`seq`);--> statement-breakpoint
CREATE INDEX `reviews_module_order` ON `reviews` (`publish`,`module`,`seq`);