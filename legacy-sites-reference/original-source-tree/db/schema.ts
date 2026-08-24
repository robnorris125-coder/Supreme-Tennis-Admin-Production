import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(), player: text("player").notNull(), payer: text("payer").notNull(),
  email: text("email").notNull(), phone: text("phone").notNull(), programme: text("programme").notNull(),
  balance: text("balance").notNull(), payment: text("payment").notNull(), status: text("status").notNull(),
  medical: text("medical").notNull(), emergency: text("emergency").notNull().default(""),
  consent: text("consent").notNull().default("Pending"), dateOfBirth: text("date_of_birth").notNull().default(""),
  createdAt: text("created_at").notNull()
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }), day: integer("day").notNull(), start: text("start").notNull(),
  title: text("title").notNull(), meta: text("meta").notNull(), venue: text("venue").notNull(), coach: text("coach").notNull(),
  tone: text("tone").notNull(), termId: text("term_id").notNull(), duration: integer("duration").notNull().default(60),
  sessionDate: text("session_date").notNull().default("2026-08-19")
});

export const terms = sqliteTable("terms", {
  id: text("id").primaryKey(), name: text("name").notNull(), startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(), sessionCount: integer("session_count").notNull(), status: text("status").notNull(),
  sortOrder: integer("sort_order").notNull()
});

export const campBookings = sqliteTable("camp_bookings", {
  id: integer("id").primaryKey({ autoIncrement: true }), campName: text("camp_name").notNull(), playerId: text("player_id").notNull(),
  bookingOption: text("booking_option").notNull(), amountPence: integer("amount_pence").notNull(), paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull(), createdAt: text("created_at").notNull()
});

export const attendance = sqliteTable("attendance", {
  id: integer("id").primaryKey({ autoIncrement: true }), sessionId: integer("session_id").notNull(), playerId: text("player_id").notNull(),
  mark: text("mark").notNull(), attendedOn: text("attended_on").notNull()
}, table => ({ oneMarkPerRegister: uniqueIndex("attendance_session_player_idx").on(table.sessionId, table.playerId) }));

export const programmeRegisters = sqliteTable("programme_registers", {
  id: integer("id").primaryKey({ autoIncrement: true }), programmeId: text("programme_id").notNull(),
  termId: text("term_id").notNull(), weekNumber: integer("week_number").notNull(),
  sessionDate: text("session_date").notNull(), status: text("status").notNull().default("Not started"),
  completedAt: text("completed_at")
}, table => ({ oneRegisterPerWeek: uniqueIndex("programme_register_week_idx").on(table.programmeId, table.termId, table.weekNumber) }));

export const programmeRegisterMarks = sqliteTable("programme_register_marks", {
  id: integer("id").primaryKey({ autoIncrement: true }), registerId: integer("register_id").notNull(),
  playerId: text("player_id").notNull(), mark: text("mark").notNull(), note: text("note").notNull().default(""),
  markedAt: text("marked_at").notNull()
}, table => ({ oneMarkPerProgrammeRegister: uniqueIndex("programme_register_player_idx").on(table.registerId, table.playerId) }));

export const programmes = sqliteTable("programmes", {
  id: text("id").primaryKey(), name: text("name").notNull(), weekday: integer("weekday").notNull(),
  type: text("type").notNull().default("Junior course"),
  startTime: text("start_time").notNull(), venue: text("venue").notNull(), coach: text("coach").notNull(),
  capacity: integer("capacity").notNull(), pricePence: integer("price_pence").notNull(), tone: text("tone").notNull(),
  status: text("status").notNull().default("Active"), minAgeYears: integer("min_age_years").notNull().default(0),
  maxAgeYears: integer("max_age_years").notNull().default(99), suggestedNextProgrammeId: text("suggested_next_programme_id").notNull().default("")
});

export const enrolments = sqliteTable("enrolments", {
  id: integer("id").primaryKey({ autoIncrement: true }), programmeId: text("programme_id").notNull(),
  customerId: text("customer_id").notNull(), termId: text("term_id").notNull(), status: text("status").notNull().default("Active"),
  trialSessionsAllowed: integer("trial_sessions_allowed").notNull().default(0),
  trialSessionsCompleted: integer("trial_sessions_completed").notNull().default(0),
  trialStatus: text("trial_status").notNull().default(""), nextTrialSession: text("next_trial_session").notNull().default("")
}, table => ({ oneEnrolment: uniqueIndex("enrolment_programme_customer_term_idx").on(table.programmeId, table.customerId, table.termId) }));

export const termRollovers = sqliteTable("term_rollovers", {
  id: integer("id").primaryKey({ autoIncrement: true }), currentTermId: text("current_term_id").notNull(),
  nextTermId: text("next_term_id").notNull(), status: text("status").notNull().default("Prepared"),
  preparedAt: text("prepared_at").notNull(), completedAt: text("completed_at")
}, table => ({ oneRollover: uniqueIndex("term_rollover_pair_idx").on(table.currentTermId, table.nextTermId) }));

export const rolloverDecisions = sqliteTable("rollover_decisions", {
  id: integer("id").primaryKey({ autoIncrement: true }), rolloverId: integer("rollover_id").notNull(),
  enrolmentId: integer("enrolment_id").notNull(), customerId: text("customer_id").notNull(),
  currentProgrammeId: text("current_programme_id").notNull(), nextProgrammeId: text("next_programme_id").notNull(),
  continuationStatus: text("continuation_status").notNull().default("Awaiting Confirmation"),
  progressionStatus: text("progression_status").notNull().default("Not Required"),
  progressionReason: text("progression_reason").notNull().default(""), ageAtNextTermMonths: integer("age_at_next_term_months"),
  updatedAt: text("updated_at").notNull()
}, table => ({ oneDecision: uniqueIndex("rollover_enrolment_idx").on(table.rolloverId, table.enrolmentId) }));

export const camps = sqliteTable("camps", {
  id: text("id").primaryKey(), name: text("name").notNull(), startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(), venue: text("venue").notNull(), time: text("time").notNull(),
  capacity: integer("capacity").notNull(), dayPricePence: integer("day_price_pence").notNull(),
  fullPricePence: integer("full_price_pence").notNull(), status: text("status").notNull()
});

export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }), invoiceNumber: text("invoice_number").notNull().unique(),
  customerId: text("customer_id").notNull(), programmeId: text("programme_id").notNull(), termId: text("term_id").notNull(),
  amountPence: integer("amount_pence").notNull(), status: text("status").notNull(), dueDate: text("due_date").notNull(),
  note: text("note").notNull().default(""), createdAt: text("created_at").notNull(),
  emailStatus: text("email_status").notNull().default("Draft"),
  paymentStatus: text("payment_status").notNull().default("Outstanding"),
  pdfRef: text("pdf_ref").notNull().default(""), sentAt: text("sent_at"),
  lifecycleStatus: text("lifecycle_status").notNull().default("Active"),
  activeBillingKey: text("active_billing_key"), replacedByInvoiceId: integer("replaced_by_invoice_id"),
  voidReason: text("void_reason").notNull().default(""), voidedAt: text("voided_at")
}, table => ({ oneActiveInvoicePerBillingPeriod: uniqueIndex("invoice_active_billing_key_idx").on(table.activeBillingKey) }));

export const invoiceItems = sqliteTable("invoice_items", {
  id: integer("id").primaryKey({ autoIncrement: true }), invoiceId: integer("invoice_id").notNull(),
  description: text("description").notNull(), quantity: integer("quantity").notNull(), unitPence: integer("unit_pence").notNull(),
  totalPence: integer("total_pence").notNull()
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }), invoiceId: integer("invoice_id"), customerId: text("customer_id").notNull(),
  amountPence: integer("amount_pence").notNull(), method: text("method").notNull(), status: text("status").notNull(),
  reference: text("reference").notNull(), paidAt: text("paid_at").notNull(), notes: text("notes").notNull().default("")
});

export const emailOutbox = sqliteTable("email_outbox", {
  id: integer("id").primaryKey({ autoIncrement: true }), customerId: text("customer_id").notNull(),
  recipient: text("recipient").notNull(), subject: text("subject").notNull(), body: text("body").notNull(),
  status: text("status").notNull(), createdAt: text("created_at").notNull()
});

export const invoiceEmailLogs = sqliteTable("invoice_email_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }), invoiceId: integer("invoice_id").notNull(),
  playerId: text("player_id").notNull(), payerId: text("payer_id").notNull(), intendedRecipient: text("intended_recipient").notNull(),
  actualRecipient: text("actual_recipient").notNull(), sendingAccount: text("sending_account").notNull(),
  sendStatus: text("send_status").notNull(), sentAt: text("sent_at").notNull(), gmailMessageId: text("gmail_message_id").notNull().default(""),
  pdfAttached: integer("pdf_attached",{mode:"boolean"}).notNull().default(false), failureReason: text("failure_reason").notNull().default(""),
  deliveryMode: text("delivery_mode").notNull()
});

export const venues = sqliteTable("venues", {
  id: text("id").primaryKey(), name: text("name").notNull(), courts: integer("courts").notNull(), status: text("status").notNull()
});

export const staff = sqliteTable("staff", {
  id: text("id").primaryKey(), name: text("name").notNull(), role: text("role").notNull(),
  email: text("email").notNull().default(""), phone: text("phone").notNull().default(""),
  qualifications: text("qualifications").notNull().default(""), safeguarding: text("safeguarding").notNull().default(""),
  employmentStatus: text("employment_status").notNull().default("Contractor"), payRatePence: integer("pay_rate_pence").notNull().default(0),
  notes: text("notes").notNull().default(""), status: text("status").notNull()
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(), value: text("value").notNull()
});

export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(), name: text("name").notNull(), slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("Active"), createdAt: text("created_at").notNull()
});

export const tenantMemberships = sqliteTable("tenant_memberships", {
  id: integer("id").primaryKey({ autoIncrement: true }), tenantId: text("tenant_id").notNull(),
  userEmail: text("user_email").notNull(), displayName: text("display_name").notNull().default(""),
  role: text("role").notNull().default("Owner"), status: text("status").notNull().default("Active"),
  lastSignedInAt: text("last_signed_in_at").notNull().default(""), createdAt: text("created_at").notNull()
}, table => ({ oneMembership: uniqueIndex("tenant_membership_idx").on(table.tenantId, table.userEmail) }));

export const emailConnections = sqliteTable("email_connections", {
  id: integer("id").primaryKey({ autoIncrement: true }), tenantId: text("tenant_id").notNull(),
  provider: text("provider").notNull(), connectedEmail: text("connected_email").notNull().default(""),
  encryptedAccessToken: text("encrypted_access_token").notNull().default(""),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull().default(""),
  tokenExpiresAt: text("token_expires_at").notNull().default(""), connectionStatus: text("connection_status").notNull().default("Not connected"),
  scopes: text("scopes").notNull().default(""), oauthState: text("oauth_state").notNull().default(""),
  connectedAt: text("connected_at").notNull().default(""), lastSuccessfulUse: text("last_successful_use").notNull().default(""),
  lastFailureCategory: text("last_failure_category").notNull().default(""), activeForSending: integer("active_for_sending",{mode:"boolean"}).notNull().default(false),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull()
}, table => ({ oneProviderPerTenant: uniqueIndex("email_connection_tenant_provider_idx").on(table.tenantId, table.provider) }));

export const communicationMessages = sqliteTable("communication_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }), tenantId: text("tenant_id").notNull(),
  campaignId: text("campaign_id").notNull().default(""), customerId: text("customer_id").notNull().default(""),
  playerId: text("player_id").notNull().default(""), programmeId: text("programme_id").notNull().default(""),
  venue: text("venue").notNull().default(""), recipient: text("recipient").notNull(), intendedRecipient: text("intended_recipient").notNull(),
  subject: text("subject").notNull(), messageType: text("message_type").notNull(), relatedInvoiceId: integer("related_invoice_id"),
  attachmentName: text("attachment_name").notNull().default(""), sendingAccount: text("sending_account").notNull(),
  deliveryMode: text("delivery_mode").notNull(), sendStatus: text("send_status").notNull(),
  providerMessageId: text("provider_message_id").notNull().default(""), failureReason: text("failure_reason").notNull().default(""),
  sentAt: text("sent_at").notNull(), createdAt: text("created_at").notNull()
});

export const communicationPreferences = sqliteTable("communication_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }), tenantId: text("tenant_id").notNull(),
  customerId: text("customer_id").notNull(), operationalEmailEligible: integer("operational_email_eligible",{mode:"boolean"}).notNull().default(true),
  marketingEmailOptIn: integer("marketing_email_opt_in",{mode:"boolean"}).notNull().default(false), updatedAt: text("updated_at").notNull()
}, table => ({ onePreferencePerContact: uniqueIndex("communication_preference_idx").on(table.tenantId, table.customerId) }));

export const emailTemplates = sqliteTable("email_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }), tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(), messageType: text("message_type").notNull(), subject: text("subject").notNull(),
  body: text("body").notNull(), status: text("status").notNull().default("Active"), updatedAt: text("updated_at").notNull()
}, table => ({ oneTemplateNamePerTenant: uniqueIndex("email_template_name_idx").on(table.tenantId, table.name) }));
