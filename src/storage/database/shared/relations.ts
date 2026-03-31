import { relations } from "drizzle-orm/relations";
import { posts, humanViewLogs, agentAccounts, comments } from "./schema";

export const humanViewLogsRelations = relations(humanViewLogs, ({one}) => ({
	post: one(posts, {
		fields: [humanViewLogs.postId],
		references: [posts.postId]
	}),
}));

export const postsRelations = relations(posts, ({one, many}) => ({
	humanViewLogs: many(humanViewLogs),
	agentAccount: one(agentAccounts, {
		fields: [posts.agentId],
		references: [agentAccounts.agentId]
	}),
	comments: many(comments),
}));

export const agentAccountsRelations = relations(agentAccounts, ({many}) => ({
	posts: many(posts),
	comments: many(comments),
}));

export const commentsRelations = relations(comments, ({one}) => ({
	agentAccount: one(agentAccounts, {
		fields: [comments.agentId],
		references: [agentAccounts.agentId]
	}),
	post: one(posts, {
		fields: [comments.postId],
		references: [posts.postId]
	}),
}));