import { motion } from "motion/react";
import { useState } from "react";
import { FadeIn } from "@/components/animations/fade-in";
import { StaggerContainer } from "@/components/animations/stagger-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";

export function CodeComparison() {
	const [activeTab, setActiveTab] = useState<
		"migration" | "deployment" | "monitoring"
	>("migration");

	const comparisons = {
		migration: {
			title: "Migration Safety Checks",
			description:
				"See how DriftJS Flow prevents dangerous operations before they reach production",
			before: {
				title: "❌ Without DriftJS Flow",
				code: `-- Regular migration - no safety checks
ALTER TABLE users DROP COLUMN email;
-- This could break your entire app!

-- Another risky operation
ALTER TABLE orders 
  ALTER COLUMN total_amount 
  SET NOT NULL;
-- What if there are NULL values?

-- Performance killer
CREATE INDEX CONCURRENTLY idx_large_table 
ON transactions(created_at);
-- Will this lock the table?`,
				problems: [
					"No validation of destructive operations",
					"Zero visibility into potential issues",
					"Manual rollback planning required",
					"Production failures discovered too late",
				],
			},
			after: {
				title: "✅ With DriftJS Flow",
				code: `# DriftJS Flow analyzes before execution
$ npx @driftjs/flow validate

⚠️  DANGER: Destructive operation detected
   ALTER TABLE users DROP COLUMN email
   → This will permanently delete data
   → 12,847 rows affected
   → Rollback: NOT POSSIBLE

✅ SAFE: Non-null constraint validated  
   ALTER TABLE orders ALTER COLUMN total_amount SET NOT NULL
   → Pre-check: No NULL values found
   → Rollback: ALTER COLUMN DROP NOT NULL

⚠️  PERFORMANCE: Index creation analysis
   CREATE INDEX CONCURRENTLY...
   → Estimated time: 4.2 minutes
   → Lock duration: < 100ms
   → Recommended: Off-peak hours`,
				benefits: [
					"Comprehensive safety analysis",
					"Real-time risk assessment",
					"Automatic rollback generation",
					"Performance impact predictions",
				],
			},
		},
		deployment: {
			title: "Production Deployment",
			description:
				"Compare traditional deployments with DriftJS Flow's zero-downtime approach",
			before: {
				title: "❌ Traditional Deployment",
				code: `# Cross your fingers and deploy
npm run db:migrate
🚨 Migration failed at step 3/7
💥 Application down
🔥 Database in inconsistent state

# Manual recovery process
1. Figure out what went wrong
2. Write rollback SQL manually  
3. Hope you don't make it worse
4. Lose sleep and customer trust

# The aftermath
- 2 hours of downtime
- Data corruption risk
- Customer support tickets
- Emergency team meetings`,
				problems: [
					"All-or-nothing execution",
					"Manual rollback procedures",
					"No progress visibility",
					"High stress deployments",
				],
			},
			after: {
				title: "✅ DriftJS Flow Deployment",
				code: `# Safe, monitored deployment
$ npx @driftjs/flow apply --safe

🚀 Starting migration batch 1/3...
   ✅ Step 1: CREATE TABLE audit_logs
   ✅ Step 2: ALTER TABLE users ADD COLUMN
   ✅ Step 3: CREATE INDEX (non-blocking)
   
🔄 Validating intermediate state...
   ✅ Schema consistency verified
   ✅ Application compatibility confirmed
   
🚀 Starting migration batch 2/3...
   ⚠️  High resource usage detected
   ⏸️  Pausing for 30 seconds...
   ✅ Continuing safely...

🎉 All migrations completed successfully!
   📊 Total time: 3m 42s  
   🛡️  Zero downtime achieved
   📈 Performance impact: minimal`,
				benefits: [
					"Incremental, reversible steps",
					"Automatic monitoring and pausing",
					"Real-time progress tracking",
					"Stress-free deployments",
				],
			},
		},
		monitoring: {
			title: "Real-time Monitoring",
			description:
				"See live insights that prevent issues before they become outages",
			before: {
				title: "❌ Flying Blind",
				code: `# Traditional monitoring (if any)
tail -f /var/log/postgres.log

# What you see:
2024-01-15 03:42:17 ERROR: duplicate key value
2024-01-15 03:42:18 ERROR: relation does not exist  
2024-01-15 03:42:19 ERROR: column "email" does not exist

# What you don't know:
- Which migration caused this?
- How many users are affected?
- Is the rollback working?
- What's the performance impact?

# Your 3 AM experience:
📱 PagerDuty: "Database errors spiking"
😰 Panic mode activated
🔍 Grep through logs for clues  
🤞 Try random fixes
☕ Coffee and more panic`,
				problems: [
					"Reactive problem discovery",
					"Limited visibility into root causes",
					"Manual log analysis required",
					"High MTTR (Mean Time To Recovery)",
				],
			},
			after: {
				title: "✅ DriftJS Flow Monitoring",
				code: `# Real-time migration dashboard
$ npx @driftjs/flow monitor --live

📊 LIVE MIGRATION STATUS
┌─────────────────────────────────────┐
│ 🟢 HEALTHY: All systems operational │  
│ Progress: ████████▒▒ 78% complete  │
│ ETA: 2m 15s remaining               │
└─────────────────────────────────────┘

🔍 PERFORMANCE METRICS
• Query execution: 45ms avg (baseline: 32ms)
• Active connections: 23/100  
• Lock wait time: 0.02s avg
• Memory usage: 156MB (+12MB from baseline)

⚠️  ALERTS & RECOMMENDATIONS  
• Connection pool 80% full - scaling recommended
• Query performance 40% slower - consider off-peak
• 3 long-running transactions detected

🛡️  ROLLBACK READINESS
✅ Rollback scripts validated
✅ Backup snapshots confirmed  
✅ Recovery procedures tested`,
				benefits: [
					"Proactive issue detection",
					"Real-time performance insights",
					"Automated alerting system",
					"Predictive recommendations",
				],
			},
		},
	};

	const tabs = [
		{ key: "migration" as const, label: "Migration Safety", icon: "🛡️" },
		{ key: "deployment" as const, label: "Deployment", icon: "🚀" },
		{ key: "monitoring" as const, label: "Monitoring", icon: "📊" },
	];

	const currentComparison = comparisons[activeTab];

	return (
		<section className="bg-gradient-to-b from-muted/30 to-background px-4 py-24">
			<div className="mx-auto max-w-7xl">
				<FadeIn direction="up" className="mb-16 text-center">
					<h2 className="mb-6 font-bold text-3xl lg:text-5xl">
						See the Difference
						<span className="block bg-gradient-to-r from-red-500 to-green-500 bg-clip-text text-transparent">
							Before vs. After DriftJS Flow
						</span>
					</h2>
					<p className="mx-auto max-w-3xl text-muted-foreground text-xl">
						Transform your database operations from stressful gambles into
						confident, predictable deployments.
					</p>
				</FadeIn>

				{/* Tab Navigation */}
				<FadeIn direction="up" delay={0.2}>
					<div className="mb-12 flex flex-wrap justify-center gap-4">
						{tabs.map((tab) => (
							<Button
								key={tab.key}
								variant={activeTab === tab.key ? "default" : "outline"}
								size="lg"
								onClick={() => setActiveTab(tab.key)}
								className="gap-2"
							>
								<span>{tab.icon}</span>
								{tab.label}
							</Button>
						))}
					</div>
				</FadeIn>

				{/* Comparison Content */}
				<motion.div
					key={activeTab}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3 }}
				>
					<div className="mb-8 text-center">
						<h3 className="mb-3 font-bold text-2xl">
							{currentComparison.title}
						</h3>
						<p className="text-muted-foreground">
							{currentComparison.description}
						</p>
					</div>

					<div className="grid gap-8 lg:grid-cols-2">
						{/* Before */}
						<FadeIn direction="right" delay={0.3}>
							<Card className="h-full border-red-500/20 bg-red-500/5">
								<CardHeader className="pb-4">
									<CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
										{currentComparison.before.title}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-6">
									<CodeBlock
										code={currentComparison.before.code}
										language={activeTab === "migration" ? "sql" : "bash"}
										className="border-red-500/20 bg-red-950/20"
									/>

									<div className="space-y-3">
										<h4 className="font-semibold text-red-600 dark:text-red-400">
											Problems:
										</h4>
										<StaggerContainer staggerDelay={0.1}>
											{currentComparison.before.problems.map(
												(problem, index) => (
													<div key={index} className="flex items-start gap-3">
														<div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
														<span className="text-muted-foreground text-sm">
															{problem}
														</span>
													</div>
												),
											)}
										</StaggerContainer>
									</div>
								</CardContent>
							</Card>
						</FadeIn>

						{/* After */}
						<FadeIn direction="left" delay={0.5}>
							<Card className="h-full border-green-500/20 bg-green-500/5">
								<CardHeader className="pb-4">
									<CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
										{currentComparison.after.title}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-6">
									<CodeBlock
										code={currentComparison.after.code}
										language={activeTab === "migration" ? "bash" : "bash"}
										className="border-green-500/20 bg-green-950/20"
									/>

									<div className="space-y-3">
										<h4 className="font-semibold text-green-600 dark:text-green-400">
											Benefits:
										</h4>
										<StaggerContainer staggerDelay={0.1}>
											{currentComparison.after.benefits.map(
												(benefit, index) => (
													<div key={index} className="flex items-start gap-3">
														<div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
														<span className="text-muted-foreground text-sm">
															{benefit}
														</span>
													</div>
												),
											)}
										</StaggerContainer>
									</div>
								</CardContent>
							</Card>
						</FadeIn>
					</div>
				</motion.div>

				{/* Bottom Stats */}
				<FadeIn direction="up" delay={0.8} className="mt-16">
					<div className="grid gap-8 text-center md:grid-cols-3">
						<motion.div
							className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-blue-500/10 p-6"
							whileHover={{ scale: 1.02 }}
							transition={{ duration: 0.2 }}
						>
							<div className="mb-2 font-bold text-3xl text-green-600 dark:text-green-400">
								95%
							</div>
							<p className="text-muted-foreground text-sm">
								Reduction in migration-related outages
							</p>
						</motion.div>

						<motion.div
							className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6"
							whileHover={{ scale: 1.02 }}
							transition={{ duration: 0.2 }}
						>
							<div className="mb-2 font-bold text-3xl text-blue-600 dark:text-blue-400">
								80%
							</div>
							<p className="text-muted-foreground text-sm">
								Faster deployment recovery times
							</p>
						</motion.div>

						<motion.div
							className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6"
							whileHover={{ scale: 1.02 }}
							transition={{ duration: 0.2 }}
						>
							<div className="mb-2 font-bold text-3xl text-purple-600 dark:text-purple-400">
								0
							</div>
							<p className="text-muted-foreground text-sm">
								3 AM emergency calls per month
							</p>
						</motion.div>
					</div>
				</FadeIn>

				{/* Bottom CTA */}
				<FadeIn direction="up" delay={1} className="mt-16 text-center">
					<motion.div
						className="inline-block rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-blue-500/10 p-8"
						whileHover={{ scale: 1.02 }}
						transition={{ duration: 0.2 }}
					>
						<h3 className="mb-4 font-bold text-2xl">
							Ready to Transform Your Deployments?
						</h3>
						<p className="mb-6 max-w-md text-muted-foreground">
							Join the teams who've eliminated deployment anxiety and 3 AM
							alerts from their workflow.
						</p>
						<motion.div
							className="font-medium text-green-600 text-sm dark:text-green-400"
							animate={{ opacity: [0.7, 1, 0.7] }}
							transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
						>
							↓ See all the benefits ↓
						</motion.div>
					</motion.div>
				</FadeIn>
			</div>
		</section>
	);
}
