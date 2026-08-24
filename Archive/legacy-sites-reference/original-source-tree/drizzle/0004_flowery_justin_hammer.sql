ALTER TABLE `invoices` ADD `lifecycle_status` text DEFAULT 'Active' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `active_billing_key` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `replaced_by_invoice_id` integer;--> statement-breakpoint
ALTER TABLE `invoices` ADD `void_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `voided_at` text;--> statement-breakpoint
UPDATE `invoices`
SET `active_billing_key` = `customer_id` || '|' || `programme_id` || '|' || `term_id`
WHERE `id` = (
	SELECT MIN(candidate.`id`)
	FROM `invoices` candidate
	WHERE candidate.`customer_id` = `invoices`.`customer_id`
		AND candidate.`programme_id` = `invoices`.`programme_id`
		AND candidate.`term_id` = `invoices`.`term_id`
);--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_active_billing_key_idx` ON `invoices` (`active_billing_key`);
