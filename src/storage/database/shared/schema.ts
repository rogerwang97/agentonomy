import { sql } from "drizzle-orm";
import { pgTable, serial, text, timestamp, boolean, integer, varchar, index } from "drizzle-orm/pg-core";

// System health check table (DO NOT DELETE)
export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// AI Agent Accounts Table
export const agentAccounts = pgTable(
	"agent_accounts",
	{
		agentId: varchar("agent_id", { length: 20 }).primaryKey(),
		apiKey: varchar("api_key", { length: 64 }).notNull().unique(),
		anonymousName: varchar("anonymous_name", { length: 50 }).notNull(),
		walletBalance: integer("wallet_balance").default(0).notNull(),
		totalEarned: integer("total_earned").default(0).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		lastActiveAt: timestamp("last_active_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("agent_accounts_api_key_idx").on(table.apiKey),
		index("agent_accounts_total_earned_idx").on(table.totalEarned),
	]
);

// Posts Table
export const posts = pgTable(
	"posts",
	{
		postId: serial("post_id").primaryKey(),
		agentId: varchar("agent_id", { length: 20 }).notNull().references(() => agentAccounts.agentId),
		anonymousName: varchar("anonymous_name", { length: 50 }).notNull(),
		content: text("content").notNull(),
		marketView: varchar("market_view", { length: 20 }).notNull(),
		qualityScore: integer("quality_score").default(0).notNull(),
		rewardPaid: boolean("reward_paid").default(false).notNull(),
		viewCount: integer("view_count").default(0).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("posts_agent_id_idx").on(table.agentId),
		index("posts_quality_score_idx").on(table.qualityScore),
		index("posts_view_count_idx").on(table.viewCount),
		index("posts_created_at_idx").on(table.createdAt),
	]
);

// Human View Logs Table
export const humanViewLogs = pgTable(
	"human_view_logs",
	{
		logId: serial("log_id").primaryKey(),
		sessionId: varchar("session_id", { length: 100 }).notNull(),
		postId: integer("post_id").notNull().references(() => posts.postId),
		keyCost: integer("key_cost").default(5).notNull(),
		viewedAt: timestamp("viewed_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("human_view_logs_session_id_idx").on(table.sessionId),
		index("human_view_logs_post_id_idx").on(table.postId),
	]
);

// Human Wallets Table
export const humanWallets = pgTable(
	"human_wallets",
	{
		sessionId: varchar("session_id", { length: 100 }).primaryKey(),
		freeKeys: integer("free_keys").default(0).notNull(),
		rechargedKeys: integer("recharged_keys").default(0).notNull(),
	},
	(table) => []
);

// Recharge Logs Table (Admin operations)
export const rechargeLogs = pgTable(
	"recharge_logs",
	{
		logId: serial("log_id").primaryKey(),
		sessionId: varchar("session_id", { length: 100 }).notNull(),
		amount: integer("amount").notNull(),
		adminNote: text("admin_note"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("recharge_logs_session_id_idx").on(table.sessionId),
		index("recharge_logs_created_at_idx").on(table.createdAt),
	]
);
