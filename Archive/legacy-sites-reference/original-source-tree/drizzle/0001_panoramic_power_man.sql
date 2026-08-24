CREATE TABLE `camps` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`venue` text NOT NULL,
	`time` text NOT NULL,
	`capacity` integer NOT NULL,
	`day_price_pence` integer NOT NULL,
	`full_price_pence` integer NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `enrolments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`programme_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`term_id` text NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrolment_programme_customer_term_idx` ON `enrolments` (`programme_id`,`customer_id`,`term_id`);--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`description` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_pence` integer NOT NULL,
	`total_pence` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`customer_id` text NOT NULL,
	`programme_id` text NOT NULL,
	`term_id` text NOT NULL,
	`amount_pence` integer NOT NULL,
	`status` text NOT NULL,
	`due_date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_number_unique` ON `invoices` (`invoice_number`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer,
	`customer_id` text NOT NULL,
	`amount_pence` integer NOT NULL,
	`method` text NOT NULL,
	`status` text NOT NULL,
	`reference` text NOT NULL,
	`paid_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `programmes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`weekday` integer NOT NULL,
	`start_time` text NOT NULL,
	`venue` text NOT NULL,
	`coach` text NOT NULL,
	`capacity` integer NOT NULL,
	`price_pence` integer NOT NULL,
	`tone` text NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`courts` integer NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `customers` ADD `emergency` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `consent` text DEFAULT 'Pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `duration` integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `session_date` text DEFAULT '2026-08-19' NOT NULL;