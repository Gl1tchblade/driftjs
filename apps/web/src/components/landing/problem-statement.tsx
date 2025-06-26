import { motion } from "motion/react";
import { FadeIn } from "@/components/animations/fade-in";
import { StaggerContainer } from "@/components/animations/stagger-container";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Card, CardContent } from "@/components/ui/card";

export function ProblemStatement() {
	const painPoints = [
		{
			icon: "🚨",
			title: "Production Outages",
			description: "Failed migrations taking down entire applications",
		},
		{
			icon: "⏰",
			title: "3AM Emergency Calls",
			description: "Woken up by alerts from failed database changes",
		},
		{
			icon: "🔄",
			title: "Manual Rollbacks",
			description: "Scrambling to manually revert breaking changes",
		},
		{
			icon: "📊",
			title: "Data Loss Risk",
			description: "Irreversible operations without proper safety checks",
		},
	];

	const stats = [
		{
			value: 73,
			suffix: "%",
			label: "of production issues are database-related",
		},
		{
			value: 4.2,
			suffix: "hrs",
			label: "average time to recover from failed migrations",
		},
		{ value: 89, suffix: "%", label: "of teams lack proper migration testing" },
	];

	return (
		<section className="bg-gradient-to-b from-background to-muted/30 px-4 py-24">
			<div className="mx-auto max-w-7xl">
				<FadeIn direction="up" className="mb-16 text-center">
					<h2 className="mb-6 font-bold text-3xl lg:text-5xl">
						Database Migrations Shouldn't Be
						<span className="block text-destructive">Your Biggest Fear</span>
					</h2>
					<p className="mx-auto max-w-3xl text-muted-foreground text-xl">
						Every deployment becomes a gamble when your migration strategy lacks
						production safety. One wrong change can bring down your entire
						application.
					</p>
				</FadeIn>

				{/* Statistics */}
				<FadeIn direction="up" delay={0.3}>
					<div className="mb-16 grid gap-8 md:grid-cols-3">
						{stats.map((stat, index) => (
							<motion.div
								key={index}
								className="rounded-2xl border border-border/50 bg-gradient-to-br from-muted/50 to-muted/20 p-6 text-center"
								whileHover={{ scale: 1.05 }}
								transition={{ duration: 0.2 }}
							>
								<div className="mb-2 font-bold text-4xl text-destructive lg:text-5xl">
									<AnimatedCounter end={stat.value} suffix={stat.suffix} />
								</div>
								<p className="text-muted-foreground">{stat.label}</p>
							</motion.div>
						))}
					</div>
				</FadeIn>

				{/* Before/After Comparison */}
				<div className="grid items-center gap-12 lg:grid-cols-2">
					{/* Before (Problems) */}
					<FadeIn direction="right" delay={0.5}>
						<div className="space-y-6">
							<div className="mb-8 flex items-center gap-3">
								<div className="h-3 w-3 rounded-full bg-destructive" />
								<h3 className="font-bold text-2xl text-destructive">
									Without DriftJS Flow
								</h3>
							</div>

							<StaggerContainer staggerDelay={0.1}>
								{painPoints.map((point, index) => (
									<Card
										key={index}
										className="border-destructive/20 bg-destructive/5"
									>
										<CardContent className="p-6">
											<div className="flex items-start gap-4">
												<span className="text-2xl">{point.icon}</span>
												<div>
													<h4 className="mb-2 font-semibold text-destructive text-lg">
														{point.title}
													</h4>
													<p className="text-muted-foreground">
														{point.description}
													</p>
												</div>
											</div>
										</CardContent>
									</Card>
								))}
							</StaggerContainer>
						</div>
					</FadeIn>

					{/* After (Solutions) */}
					<FadeIn direction="left" delay={0.7}>
						<div className="space-y-6">
							<div className="mb-8 flex items-center gap-3">
								<div className="h-3 w-3 rounded-full bg-green-500" />
								<h3 className="font-bold text-2xl text-green-600 dark:text-green-400">
									With DriftJS Flow
								</h3>
							</div>

							<StaggerContainer staggerDelay={0.1}>
								<Card className="border-green-500/20 bg-green-500/5">
									<CardContent className="p-6">
										<div className="flex items-start gap-4">
											<span className="text-2xl">✅</span>
											<div>
												<h4 className="mb-2 font-semibold text-green-600 text-lg dark:text-green-400">
													Automated Safety Checks
												</h4>
												<p className="text-muted-foreground">
													Every migration is analyzed for potential issues
													before execution
												</p>
											</div>
										</div>
									</CardContent>
								</Card>

								<Card className="border-green-500/20 bg-green-500/5">
									<CardContent className="p-6">
										<div className="flex items-start gap-4">
											<span className="text-2xl">🛡️</span>
											<div>
												<h4 className="mb-2 font-semibold text-green-600 text-lg dark:text-green-400">
													Zero-Downtime Deployments
												</h4>
												<p className="text-muted-foreground">
													Smart rollback strategies and production-safe
													execution
												</p>
											</div>
										</div>
									</CardContent>
								</Card>

								<Card className="border-green-500/20 bg-green-500/5">
									<CardContent className="p-6">
										<div className="flex items-start gap-4">
											<span className="text-2xl">📊</span>
											<div>
												<h4 className="mb-2 font-semibold text-green-600 text-lg dark:text-green-400">
													Real-time Monitoring
												</h4>
												<p className="text-muted-foreground">
													Track migration progress and get instant alerts if
													something goes wrong
												</p>
											</div>
										</div>
									</CardContent>
								</Card>

								<Card className="border-green-500/20 bg-green-500/5">
									<CardContent className="p-6">
										<div className="flex items-start gap-4">
											<span className="text-2xl">🔄</span>
											<div>
												<h4 className="mb-2 font-semibold text-green-600 text-lg dark:text-green-400">
													Automatic Rollback
												</h4>
												<p className="text-muted-foreground">
													Failed migrations are automatically reverted to
													prevent data corruption
												</p>
											</div>
										</div>
									</CardContent>
								</Card>
							</StaggerContainer>
						</div>
					</FadeIn>
				</div>

				{/* Call to Action */}
				<FadeIn direction="up" delay={1} className="mt-16 text-center">
					<motion.div
						className="inline-block rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-blue-500/10 p-8"
						whileHover={{ scale: 1.02 }}
						transition={{ duration: 0.2 }}
					>
						<h3 className="mb-4 font-bold text-2xl">
							Ready to Sleep Peacefully Again?
						</h3>
						<p className="mb-6 max-w-md text-muted-foreground">
							Join thousands of developers who've eliminated migration anxiety
							from their workflow.
						</p>
						<motion.div
							className="font-medium text-green-600 text-sm dark:text-green-400"
							animate={{ opacity: [0.7, 1, 0.7] }}
							transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
						>
							↓ See how it works below ↓
						</motion.div>
					</motion.div>
				</FadeIn>
			</div>
		</section>
	);
}
