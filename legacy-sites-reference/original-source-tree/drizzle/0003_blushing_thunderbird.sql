CREATE TABLE `invoice_email_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`player_id` text NOT NULL,
	`payer_id` text NOT NULL,
	`intended_recipient` text NOT NULL,
	`actual_recipient` text NOT NULL,
	`sending_account` text NOT NULL,
	`send_status` text NOT NULL,
	`sent_at` text NOT NULL,
	`gmail_message_id` text DEFAULT '' NOT NULL,
	`pdf_attached` integer DEFAULT false NOT NULL,
	`failure_reason` text DEFAULT '' NOT NULL,
	`delivery_mode` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `invoices` ADD `email_status` text DEFAULT 'Draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `payment_status` text DEFAULT 'Outstanding' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `pdf_ref` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `sent_at` text;--> statement-breakpoint
UPDATE `invoices` SET
	`email_status` = CASE WHEN `status` = 'Sent' OR EXISTS (
		SELECT 1 FROM `email_outbox` e WHERE e.`customer_id` = `invoices`.`customer_id`
		AND e.`subject` LIKE '%' || `invoices`.`invoice_number` || '%'
		AND e.`status` IN ('Sent','Test sent to Rob','Sent to parent')
	) THEN 'Sent' ELSE 'Ready to send' END,
	`payment_status` = CASE WHEN `status` = 'Paid' THEN 'Paid' ELSE 'Outstanding' END,
	`pdf_ref` = '/api/invoice?invoiceId=' || `id`;
