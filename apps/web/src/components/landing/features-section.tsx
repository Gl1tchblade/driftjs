import { motion } from "motion/react";
import { FadeIn } from "@/components/animations/fade-in";
import { StaggerContainer } from "@/components/animations/stagger-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FeaturesSection() {
	const features = [
		{
			icon: "🛡️",
			title: "Production Safety Checks",
			description:
				"Advanced static analysis detects dangerous operations before they hit production. Get warnings for non-reversible changes, potential data loss, and performance impacts.",
			details: [
				"Destructive operation detection",
				"Performance impact analysis",
				"Rollback strategy validation",
			],
		},
		{
			icon: "🔄",
			title: "Smart Rollback System",
			description:
				"Automated rollback strategies with transaction-level precision. Every migration includes a tested rollback path, executed automatically on failure.",
			details: [
				"Automatic rollback generation",
				"Transaction boundary management",
				"State consistency validation",
			],
		},
		{
			icon: "📊",
			title: "Real-time Monitoring",
			description:
				"Live migration progress tracking with detailed metrics. Monitor query execution times, lock durations, and resource usage in real-time.",
			details: [
				"Live progress tracking",
				"Performance metrics",
				"Resource usage monitoring",
			],
		},
		{
			icon: "🧪",
			title: "Test-Driven Migrations",
			description:
				"Built-in testing framework validates migrations against schema snapshots and data integrity constraints before production deployment.",
			details: [
				"Schema snapshot testing",
				"Data integrity validation",
				"Pre-deployment verification",
			],
		},
		{
			icon: "⚡",
			title: "Zero-Downtime Deployments",
			description:
				"Intelligent execution strategies minimize downtime through connection pooling, lock optimization, and gradual rollouts for large datasets.",
			details: [
				"Connection pool management",
				"Lock duration optimization",
				"Gradual rollout strategies",
			],
		},
		{
			icon: "🔍",
			title: "Deep Schema Analysis",
			description:
				"Comprehensive dependency analysis prevents cascading failures. Understand the full impact of changes across your entire database schema.",
			details: [
				"Dependency graph analysis",
				"Impact assessment reports",
				"Cross-table relationship mapping",
			],
		},
		{
			icon: "📱",
			title: "Multi-ORM Support",
			description:
				"Works seamlessly with Prisma, Drizzle, TypeORM, and Sequelize. No need to change your existing workflow or learn new tools.",
			details: [
				"Prisma integration",
				"Drizzle ORM support",
				"TypeORM & Sequelize compatibility",
			],
		},
		{
			icon: "🌐",
			title: "Team Collaboration",
			description:
				"Centralized migration history with approval workflows. Track who ran what, when, and why with full audit trails and team notifications.",
			details: [
				"Migration approval workflows",
				"Complete audit trails",
				"Team notification system",
			],
		},
	];

	return (
		<section className="bg-gradient-to-b from-muted/30 to-background px-4 py-24">
			<div className="mx-auto max-w-7xl">
				<FadeIn direction="up" className="mb-16 text-center">
					<h2 className="mb-6 font-bold text-3xl lg:text-5xl">
						Production-Grade Features for
						<span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
							Mission-Critical Databases
						</span>
					</h2>
					<p className="mx-auto max-w-3xl text-muted-foreground text-xl">
						Every feature is designed with one goal: eliminate the fear and
						uncertainty from database migrations in production environments.
					</p>
				</FadeIn>

				<StaggerContainer staggerDelay={0.1}>
					<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
						{features.map((feature, index) => (
							<motion.div
								key={index}
								className="group"
								whileHover={{ y: -5 }}
								transition={{ duration: 0.2 }}
							>
								<Card className="h-full border-border/50 bg-gradient-to-br from-background to-muted/20 transition-all duration-300 hover:border-primary/30">
									<CardHeader>
										<div className="mb-4 flex items-center gap-4">
											<motion.div
												className="text-4xl"
												whileHover={{ scale: 1.2, rotate: 5 }}
												transition={{ duration: 0.2 }}
											>
												{feature.icon}
											</motion.div>
											<CardTitle className="text-xl transition-colors duration-300 group-hover:text-primary">
												{feature.title}
											</CardTitle>
										</div>
										<p className="text-muted-foreground leading-relaxed">
											{feature.description}
										</p>
									</CardHeader>
									<CardContent>
										<div className="space-y-2">
											{feature.details.map((detail, detailIndex) => (
												<motion.div
													key={detailIndex}
													className="flex items-center gap-3 text-muted-foreground text-sm"
													initial={{ opacity: 0, x: -10 }}
													whileInView={{ opacity: 1, x: 0 }}
													transition={{ delay: detailIndex * 0.1 }}
													viewport={{ once: true }}
												>
													<div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
													<span>{detail}</span>
												</motion.div>
											))}
										</div>
									</CardContent>
								</Card>
							</motion.div>
						))}
					</div>
				</StaggerContainer>

				{/* Bottom CTA */}
				<FadeIn direction="up" delay={0.8} className="mt-16 text-center">
					<motion.div
						className="inline-block rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-purple-500/10 p-8"
						whileHover={{ scale: 1.02 }}
						transition={{ duration: 0.2 }}
					>
						<h3 className="mb-4 font-bold text-2xl">
							Built by Developers, for Developers
						</h3>
						<p className="mb-6 max-w-md text-muted-foreground">
							Every feature addresses real-world pain points we've experienced
							firsthand in production environments.
						</p>
						<motion.div
							className="font-medium text-primary text-sm"
							animate={{ opacity: [0.7, 1, 0.7] }}
							transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
						>
							↓ See the step-by-step process ↓
						</motion.div>
					</motion.div>
				</FadeIn>
			</div>
		</section>
	);
}
