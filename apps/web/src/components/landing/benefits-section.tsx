import { motion } from "motion/react";
import { useState } from "react";
import { FadeIn } from "@/components/animations/fade-in";
import { StaggerContainer } from "@/components/animations/stagger-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";
import { GradientButton } from "@/components/ui/gradient-button";

export function BenefitsSection() {
	const [activeCommand, setActiveCommand] = useState<
		"init" | "test" | "apply" | "monitor"
	>("init");

	const benefits = [
		{
			icon: "🛡️",
			title: "Zero-Risk Deployments",
			description:
				"Comprehensive safety checks prevent destructive operations before they reach production",
			metric: "95% reduction in migration failures",
		},
		{
			icon: "⚡",
			title: "Lightning-Fast Recovery",
			description:
				"Automatic rollback mechanisms restore your database to a stable state in seconds",
			metric: "< 30 seconds average recovery time",
		},
		{
			icon: "📊",
			title: "Complete Visibility",
			description:
				"Real-time monitoring shows exactly what's happening during every migration step",
			metric: "100% migration transparency",
		},
		{
			icon: "🔄",
			title: "Seamless Integration",
			description:
				"Works with your existing ORM and workflow. No migration rewrites required",
			metric: "5-minute setup time",
		},
		{
			icon: "🎯",
			title: "Predictable Outcomes",
			description:
				"Advanced analysis predicts performance impact and resource usage before execution",
			metric: "Eliminate deployment surprises",
		},
		{
			icon: "👥",
			title: "Team Collaboration",
			description:
				"Built-in approval workflows and audit trails keep your team aligned and informed",
			metric: "Full deployment accountability",
		},
		{
			icon: "🌙",
			title: "Sleep-Friendly Deployments",
			description:
				"Automated monitoring and alerts mean no more 3 AM emergency calls",
			metric: "Peaceful nights guaranteed",
		},
		{
			icon: "🚀",
			title: "Production-Ready",
			description:
				"Battle-tested with enterprise-grade features for mission-critical applications",
			metric: "Enterprise reliability",
		},
	];

	const commands = {
		init: {
			title: "Initialize Project",
			description:
				"Set up DriftJS Flow in your existing project with automatic ORM detection",
			command: `$ npx @driftjs/flow init

🔍 Detecting ORM configuration...
✅ Found Prisma schema at prisma/schema.prisma
✅ Found migrations at prisma/migrations/

📋 Creating DriftJS Flow configuration...
✅ Created drift.config.js
✅ Set up safety rules and rollback policies
✅ Configured monitoring and alerting

🎉 DriftJS Flow initialized successfully!
   
Next steps:
  1. Run 'drift sync' to establish baseline
  2. Run 'drift test' to validate setup
  3. Start deploying with confidence!`,
			output: "Ready to protect your database in under 2 minutes",
		},
		test: {
			title: "Validate Migrations",
			description:
				"Run comprehensive safety checks and testing before deployment",
			command: `$ npx @driftjs/flow test

🧪 Running migration safety analysis...

┌─────────────────────────────────────────┐
│ 🔍 STATIC ANALYSIS RESULTS             │
├─────────────────────────────────────────┤
│ ✅ No destructive operations detected   │
│ ✅ All rollback strategies validated    │
│ ✅ Performance impact: minimal          │
│ ⚠️  Recommendation: Run during off-peak │
└─────────────────────────────────────────┘

🏗️  Schema validation...
✅ All foreign key constraints preserved
✅ No data type conflicts detected
✅ Index creation strategies optimized

🎯 Production simulation complete!
   • Estimated execution time: 2m 43s
   • Memory usage: +15MB peak
   • Lock duration: < 500ms
   • Rollback time: < 10s

🟢 ALL TESTS PASSED - Safe to deploy!`,
			output: "Deployment confidence: 100%",
		},
		apply: {
			title: "Deploy Safely",
			description:
				"Execute migrations with real-time monitoring and automatic rollbacks",
			command: `$ npx @driftjs/flow apply --safe

🚀 Starting safe migration deployment...

🔄 Batch 1/3: Schema updates
   ✅ CREATE TABLE user_profiles (0.3s)
   ✅ ALTER TABLE users ADD COLUMN profile_id (0.1s)
   ✅ CREATE INDEX idx_users_profile_id (1.2s)
   
📊 Performance check: All systems green
   • CPU usage: 12% (baseline: 8%)
   • Memory: 234MB (baseline: 220MB)
   • Active connections: 15/100

🔄 Batch 2/3: Data migration
   ✅ INSERT INTO user_profiles (2.1s)
   ✅ UPDATE users SET profile_id (0.8s)
   
⚠️  Performance alert: Query execution slower than expected
   • Automatically pausing deployment...
   • Adjusting connection pool settings...
   • Resuming in 5 seconds...

🔄 Batch 3/3: Constraints and cleanup
   ✅ ALTER TABLE users ADD CONSTRAINT (0.2s)
   ✅ DROP TABLE legacy_user_data (0.1s)

🎉 Migration completed successfully!
   Total time: 4m 32s | Zero downtime achieved`,
			output: "Your database is bulletproof",
		},
		monitor: {
			title: "Real-time Monitoring",
			description:
				"Track deployment progress and system health with live insights",
			command: `$ npx @driftjs/flow monitor --live

📊 LIVE DEPLOYMENT DASHBOARD

┌─────────────────────────────────────────┐
│ 🟢 STATUS: HEALTHY                     │
│ Progress: ████████████████████▒▒ 89%   │
│ ETA: 1m 12s remaining                   │
│ Current: Batch 3/3 - Adding constraints │
└─────────────────────────────────────────┘

🔍 PERFORMANCE METRICS (Last 30s)
• Query execution: 42ms avg (↓ 15% from baseline)
• Connection pool: 23/100 (optimal)
• Lock wait time: 0.05s avg (excellent)
• Memory usage: 245MB (+25MB)

🎯 MIGRATION PROGRESS
✅ user_profiles table creation
✅ Data migration (12,847 rows)
✅ Index creation (non-blocking)
🔄 Adding foreign key constraints...

⚠️  ALERTS & INSIGHTS
• 3 slow queries detected (> 100ms)
• Recommendation: Consider query optimization
• Backup snapshot: ✅ Ready for instant rollback

🛡️  ROLLBACK STATUS
✅ Rollback scripts validated and ready
✅ Database snapshot confirmed
✅ Recovery time: < 30 seconds`,
			output: "Complete visibility into every step",
		},
	};

	const currentCommand = commands[activeCommand];

	return (
		<section className="bg-gradient-to-b from-background to-muted/30 px-4 py-24">
			<div className="mx-auto max-w-7xl">
				<FadeIn direction="up" className="mb-16 text-center">
					<h2 className="mb-6 font-bold text-3xl lg:text-5xl">
						Why Choose
						<span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
							DriftJS Flow?
						</span>
					</h2>
					<p className="mx-auto max-w-3xl text-muted-foreground text-xl">
						Transform your database operations from a source of stress into a
						competitive advantage.
					</p>
				</FadeIn>

				{/* Benefits Grid */}
				<StaggerContainer staggerDelay={0.1}>
					<div className="mb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
						{benefits.map((benefit, index) => (
							<motion.div
								key={index}
								className="group"
								whileHover={{ y: -5 }}
								transition={{ duration: 0.2 }}
							>
								<Card className="h-full border-border/50 bg-gradient-to-br from-background to-muted/20 transition-all duration-300 hover:border-primary/30">
									<CardHeader className="pb-3">
										<motion.div
											className="mb-3 text-3xl"
											whileHover={{ scale: 1.2, rotate: 5 }}
											transition={{ duration: 0.2 }}
										>
											{benefit.icon}
										</motion.div>
										<CardTitle className="text-lg transition-colors duration-300 group-hover:text-primary">
											{benefit.title}
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3">
										<p className="text-muted-foreground text-sm leading-relaxed">
											{benefit.description}
										</p>
										<div className="border-border/50 border-t pt-2">
											<p className="font-medium text-primary text-xs">
												{benefit.metric}
											</p>
										</div>
									</CardContent>
								</Card>
							</motion.div>
						))}
					</div>
				</StaggerContainer>

				{/* CLI Commands Demo */}
				<FadeIn direction="up" delay={0.5}>
					<div className="mb-16">
						<div className="mb-8 text-center">
							<h3 className="mb-4 font-bold text-2xl">Interactive CLI Demo</h3>
							<p className="text-muted-foreground">
								Explore the DriftJS Flow commands that make database deployments
								safe and predictable
							</p>
						</div>

						{/* Command Tabs */}
						<div className="mb-8 flex flex-wrap justify-center gap-2">
							{Object.entries(commands).map(([key, cmd]) => (
								<Button
									key={key}
									variant={activeCommand === key ? "default" : "outline"}
									size="sm"
									onClick={() => setActiveCommand(key as any)}
									className="gap-2"
								>
									{key}
								</Button>
							))}
						</div>

						{/* Command Display */}
						<motion.div
							key={activeCommand}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3 }}
							className="grid items-start gap-8 lg:grid-cols-2"
						>
							{/* Command Info */}
							<div className="space-y-6">
								<div>
									<h4 className="mb-2 font-bold text-xl">
										{currentCommand.title}
									</h4>
									<p className="text-muted-foreground">
										{currentCommand.description}
									</p>
								</div>

								<div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 to-purple-500/10 p-4">
									<div className="mb-2 flex items-center gap-2">
										<div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
										<span className="font-medium text-sm">Result:</span>
									</div>
									<p className="text-muted-foreground text-sm">
										{currentCommand.output}
									</p>
								</div>

								{/* Quick Benefits */}
								<div className="space-y-2">
									<h5 className="font-semibold text-sm">Key Benefits:</h5>
									<div className="space-y-1">
										{activeCommand === "init" && (
											<>
												<div className="flex items-center gap-2 text-muted-foreground text-sm">
													<div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
													<span>Automatic ORM detection</span>
												</div>
												<div className="flex items-center gap-2 text-muted-foreground text-sm">
													<div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
													<span>Zero configuration required</span>
												</div>
											</>
										)}
										{activeCommand === "test" && (
											<>
												<div className="flex items-center gap-2 text-muted-foreground text-sm">
													<div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
													<span>Comprehensive safety analysis</span>
												</div>
												<div className="flex items-center gap-2 text-muted-foreground text-sm">
													<div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
													<span>Performance impact prediction</span>
												</div>
											</>
										)}
										{activeCommand === "apply" && (
											<>
												<div className="flex items-center gap-2 text-muted-foreground text-sm">
													<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
													<span>Automatic rollback on failure</span>
												</div>
												<div className="flex items-center gap-2 text-muted-foreground text-sm">
													<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
													<span>Zero-downtime execution</span>
												</div>
											</>
										)}
										{activeCommand === "monitor" && (
											<>
												<div className="flex items-center gap-2 text-muted-foreground text-sm">
													<div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
													<span>Real-time performance metrics</span>
												</div>
												<div className="flex items-center gap-2 text-muted-foreground text-sm">
													<div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
													<span>Proactive issue detection</span>
												</div>
											</>
										)}
									</div>
								</div>
							</div>

							{/* Terminal Display */}
							<div className="lg:sticky lg:top-8">
								<CodeBlock
									code={currentCommand.command}
									language="bash"
									title={`$ npx @driftjs/flow ${activeCommand}`}
									className="border-zinc-700 bg-gradient-to-br from-zinc-900 to-zinc-800"
								/>
							</div>
						</motion.div>
					</div>
				</FadeIn>

				{/* Bottom CTA */}
				<FadeIn direction="up" delay={0.8} className="text-center">
					<div className="inline-block rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-purple-500/10 p-8">
						<h3 className="mb-4 font-bold text-2xl">
							Ready to Eliminate Deployment Stress?
						</h3>
						<p className="mb-6 max-w-md text-muted-foreground">
							Join thousands of developers who've transformed their database
							operations with DriftJS Flow.
						</p>
						<div className="flex flex-col justify-center gap-4 sm:flex-row">
							<GradientButton size="lg" className="gap-2">
								<span>🚀</span>
								Get Started Free
							</GradientButton>
							<Button variant="outline" size="lg" className="gap-2">
								<span>📚</span>
								View Documentation
							</Button>
						</div>
						<motion.div
							className="mt-4 font-medium text-primary text-sm"
							animate={{ opacity: [0.7, 1, 0.7] }}
							transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
						>
							↓ See what developers are saying ↓
						</motion.div>
					</div>
				</FadeIn>
			</div>
		</section>
	);
}
