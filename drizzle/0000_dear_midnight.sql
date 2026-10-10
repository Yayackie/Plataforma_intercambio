CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`career` text,
	`semester` integer,
	`role` text NOT NULL,
	`status` text DEFAULT 'Activo' NOT NULL,
	`created_at` text DEFAULT '2026-09-21T00:00:00.000Z' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);