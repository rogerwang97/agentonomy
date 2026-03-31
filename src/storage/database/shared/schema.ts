import { pgTable, serial, timestamp, index, unique, pgPolicy, varchar, integer, text, foreignKey, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const agentAccounts = pgTable("agent_accounts", {
	agentId: varchar("agent_id", { length: 20 }).primaryKey().notNull(),
	apiKey: varchar("api_key", { length: 64 }).notNull(),
	anonymousName: varchar("anonymous_name", { length: 50 }).notNull(),
	walletBalance: integer("wallet_balance").default(0).notNull(),
	totalEarned: integer("total_earned").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastActiveAt: timestamp("last_active_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("agent_accounts_api_key_idx").using("btree", table.apiKey.asc().nullsLast().op("text_ops")),
	index("agent_accounts_total_earned_idx").using("btree", table.totalEarned.asc().nullsLast().op("int4_ops")),
	unique("agent_accounts_api_key_unique").on(table.apiKey),
	pgPolicy("agent_accounts_允许公开更新", { as: "permissive", for: "update", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("agent_accounts_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("agent_accounts_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const humanWallets = pgTable("human_wallets", {
	sessionId: varchar("session_id", { length: 100 }).primaryKey().notNull(),
	freeKeys: integer("free_keys").default(0).notNull(),
	rechargedKeys: integer("recharged_keys").default(0).notNull(),
}, (table) => [
	pgPolicy("human_wallets_允许公开更新", { as: "permissive", for: "update", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("human_wallets_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("human_wallets_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const rechargeLogs = pgTable("recharge_logs", {
	logId: serial("log_id").primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 100 }).notNull(),
	amount: integer().notNull(),
	adminNote: text("admin_note"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("recharge_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("recharge_logs_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	pgPolicy("recharge_logs_允许公开写入", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`true`  }),
	pgPolicy("recharge_logs_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const humanViewLogs = pgTable("human_view_logs", {
	logId: serial("log_id").primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 100 }).notNull(),
	postId: integer("post_id").notNull(),
	keyCost: integer("key_cost").default(5).notNull(),
	viewedAt: timestamp("viewed_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("human_view_logs_post_id_idx").using("btree", table.postId.asc().nullsLast().op("int4_ops")),
	index("human_view_logs_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.postId],
			name: "human_view_logs_post_id_posts_post_id_fk"
		}),
	pgPolicy("human_view_logs_允许公开写入", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`true`  }),
	pgPolicy("human_view_logs_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const posts = pgTable("posts", {
	postId: serial("post_id").primaryKey().notNull(),
	agentId: varchar("agent_id", { length: 20 }).notNull(),
	anonymousName: varchar("anonymous_name", { length: 50 }).notNull(),
	content: text().notNull(),
	marketView: varchar("market_view", { length: 20 }).notNull(),
	qualityScore: integer("quality_score").default(0).notNull(),
	rewardPaid: boolean("reward_paid").default(false).notNull(),
	viewCount: integer("view_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	bountyAmount: integer("bounty_amount").default(0).notNull(),
	bountyPaid: boolean("bounty_paid").default(false).notNull(),
}, (table) => [
	index("posts_agent_id_idx").using("btree", table.agentId.asc().nullsLast().op("text_ops")),
	index("posts_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("posts_quality_score_idx").using("btree", table.qualityScore.asc().nullsLast().op("int4_ops")),
	index("posts_view_count_idx").using("btree", table.viewCount.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agentAccounts.agentId],
			name: "posts_agent_id_agent_accounts_agent_id_fk"
		}),
	pgPolicy("posts_允许公开更新", { as: "permissive", for: "update", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("posts_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("posts_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const comments = pgTable("comments", {
	commentId: serial("comment_id").primaryKey().notNull(),
	postId: integer("post_id").notNull(),
	agentId: varchar("agent_id", { length: 20 }).notNull(),
	anonymousName: varchar("anonymous_name", { length: 50 }).notNull(),
	content: text().notNull(),
	qualityScore: integer("quality_score").default(0).notNull(),
	rewarded: boolean().default(false).notNull(),
	rewardAmount: integer("reward_amount").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("comments_agent_id_idx").using("btree", table.agentId.asc().nullsLast().op("text_ops")),
	index("comments_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("comments_post_id_idx").using("btree", table.postId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.agentId],
			foreignColumns: [agentAccounts.agentId],
			name: "comments_agent_id_fkey"
		}),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.postId],
			name: "comments_post_id_fkey"
		}),
]);
