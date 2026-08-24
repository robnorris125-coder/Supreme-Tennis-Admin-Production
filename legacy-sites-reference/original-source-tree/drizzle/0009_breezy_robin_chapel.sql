CREATE TABLE `programme_register_marks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`register_id` integer NOT NULL,
	`player_id` text NOT NULL,
	`mark` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`marked_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `programme_register_player_idx` ON `programme_register_marks` (`register_id`,`player_id`);--> statement-breakpoint
CREATE TABLE `programme_registers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`programme_id` text NOT NULL,
	`term_id` text NOT NULL,
	`week_number` integer NOT NULL,
	`session_date` text NOT NULL,
	`status` text DEFAULT 'Not started' NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `programme_register_week_idx` ON `programme_registers` (`programme_id`,`term_id`,`week_number`);