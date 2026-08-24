CREATE TABLE `attendance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`player_id` text NOT NULL,
	`mark` text NOT NULL,
	`attended_on` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_session_player_idx` ON `attendance` (`session_id`,`player_id`);--> statement-breakpoint
CREATE TABLE `camp_bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`camp_name` text NOT NULL,
	`player_id` text NOT NULL,
	`booking_option` text NOT NULL,
	`amount_pence` integer NOT NULL,
	`payment_method` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`player` text NOT NULL,
	`payer` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`programme` text NOT NULL,
	`balance` text NOT NULL,
	`payment` text NOT NULL,
	`status` text NOT NULL,
	`medical` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day` integer NOT NULL,
	`start` text NOT NULL,
	`title` text NOT NULL,
	`meta` text NOT NULL,
	`venue` text NOT NULL,
	`coach` text NOT NULL,
	`tone` text NOT NULL,
	`term_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `terms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`session_count` integer NOT NULL,
	`status` text NOT NULL,
	`sort_order` integer NOT NULL
);
