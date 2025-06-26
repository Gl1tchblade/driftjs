import { motion } from "motion/react";
import { FadeIn } from "@/components/animations/fade-in";
import { StaggerContainer } from "@/components/animations/stagger-container";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Card, CardContent } from "@/components/ui/card";

export function TrustIndicators() {
	const stats = [
		{
			value: 50000,
			suffix: "+",
			label: "Migrations Protected",
			description: "Successful deployments without downtime",
		},
		{
			value: 2300,
			suffix: "+",
			label: "Teams Using DriftJS",
			description: "From startups to Fortune 500",
		},
		{
			value: 99.9,
			suffix: "%",
			label: "Uptime Achieved",
			description: "Zero-downtime deployment success rate",
		},
		{
			value: 85,
			suffix: "%",
			label: "Faster Recovery",
			description: "Reduced time to fix migration issues",
		},
	];

	const testimonials = [
		{
			quote:
				"DriftJS Flow eliminated our 3 AM database emergency calls. Our deployment confidence went from 30% to 100% overnight.",
			author: "Sarah Chen",
			role: "Senior DevOps Engineer",
			company: "TechFlow Inc",
			avatar: "👩‍💻",
		},
		{
			quote:
				"We've run 500+ migrations with zero production issues since adopting DriftJS Flow. It's a game-changer for database operations.",
			author: "Marcus Rodriguez",
			role: "Lead Backend Developer",
			company: "DataStream Solutions",
			avatar: "👨‍💻",
		},
		{
			quote:
				"The real-time monitoring and automatic rollbacks saved us from a major outage last month. Worth every penny.",
			author: "Alex Kim",
			role: "Platform Engineering Manager",
			company: "CloudScale Systems",
			avatar: "👨‍🔧",
		},
	];

	const integrations = [
		{ name: "Prisma", icon: "🔷", users: "25k+" },
		{ name: "Drizzle", icon: "🟡", users: "12k+" },
		{ name: "TypeORM", icon: "🔴", users: "18k+" },
		{ name: "Sequelize", icon: "🔵", users: "8k+" },
		{ name: "PostgreSQL", icon: "🐘", users: "35k+" },
		{ name: "MySQL", icon: "🐬", users: "22k+" },
		{ name: "SQLite", icon: "📦", users: "15k+" },
		{ name: "MongoDB", icon: "🍃", users: "9k+" },
	];

	const metrics = [
		{
			icon: "⭐",
			value: "4.9/5",
			label: "Developer Satisfaction",
			subtext: "Based on 1,200+ reviews",
		},
		{
			icon: "🚀",
			value: "< 5min",
			label: "Average Setup Time",
			subtext: "From install to first safe deployment",
		},
		{
			icon: "🛡️",
			value: "0",
			label: "Data Loss Incidents",
			subtext: "In 50,000+ protected migrations",
		},
		{
			icon: "📈",
			value: "300%",
			label: "Deployment Confidence",
			subtext: "Increase reported by teams using DriftJS",
		},
	];

	return (
		<section className="bg-gradient-to-b from-muted/30 to-background px-4 py-24">
			<div className="mx-auto max-w-7xl">
				<FadeIn direction="up" className="mb-16 text-center">
					<h2 className="mb-6 font-bold text-3xl lg:text-5xl">
						Trusted by Developers
						<span className="block bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
							Worldwide
						</span>
					</h2>
					<p className="mx-auto max-w-3xl text-muted-foreground text-xl">
						Join thousands of teams who've transformed their database operations
						from a source of stress into a competitive advantage.
					</p>
				</FadeIn>

				{/* Main Statistics */}
				<FadeIn direction="up" delay={0.2}>
					<div className="mb-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
						{stats.map((stat, index) => (
							<motion.div
								key={index}
								className="rounded-2xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-6 text-center"
								whileHover={{ scale: 1.05, y: -5 }}
								transition={{ duration: 0.2 }}
							>
								<div className="mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text font-bold text-4xl text-transparent lg:text-5xl">
									<AnimatedCounter end={stat.value} suffix={stat.suffix} />
								</div>
								<h3 className="mb-2 font-semibold text-lg">{stat.label}</h3>
								<p className="text-muted-foreground text-sm">
									{stat.description}
								</p>
							</motion.div>
						))}
					</div>
				</FadeIn>

				{/* Testimonials */}
				<FadeIn direction="up" delay={0.4}>
					<div className="mb-16">
						<h3 className="mb-8 text-center font-bold text-2xl">
							What Developers Are Saying
						</h3>
						<StaggerContainer staggerDelay={0.2}>
							<div className="grid gap-8 md:grid-cols-3">
								{testimonials.map((testimonial, index) => (
									<Card
										key={index}
										className="border-border/50 bg-gradient-to-br from-background to-muted/20"
									>
										<CardContent className="p-6">
											<div className="mb-4 flex items-start gap-4">
												<div className="text-3xl">{testimonial.avatar}</div>
												<div className="flex-1">
													<div className="mb-1 flex items-center gap-1">
														{[...Array(5)].map((_, i) => (
															<span key={i} className="text-sm text-yellow-500">
																⭐
															</span>
														))}
													</div>
													<blockquote className="mb-4 text-muted-foreground text-sm italic">
														"{testimonial.quote}"
													</blockquote>
												</div>
											</div>
											<div className="border-border/50 border-t pt-4">
												<p className="font-semibold text-sm">
													{testimonial.author}
												</p>
												<p className="text-muted-foreground text-xs">
													{testimonial.role}
												</p>
												<p className="text-primary text-xs">
													{testimonial.company}
												</p>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</StaggerContainer>
					</div>
				</FadeIn>

				{/* Integrations & Compatibility */}
				<FadeIn direction="up" delay={0.6}>
					<div className="mb-16">
						<h3 className="mb-8 text-center font-bold text-2xl">
							Works With Your Stack
						</h3>
						<div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
							{integrations.map((integration, index) => (
								<motion.div
									key={index}
									className="rounded-xl border border-border/30 bg-gradient-to-br from-muted/30 to-muted/10 p-4 text-center"
									whileHover={{ scale: 1.05, y: -2 }}
									transition={{ duration: 0.2 }}
								>
									<div className="mb-2 text-2xl">{integration.icon}</div>
									<p className="mb-1 font-medium text-sm">{integration.name}</p>
									<p className="text-muted-foreground text-xs">
										{integration.users}
									</p>
								</motion.div>
							))}
						</div>
					</div>
				</FadeIn>

				{/* Detailed Metrics */}
				<FadeIn direction="up" delay={0.8}>
					<div className="mb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
						{metrics.map((metric, index) => (
							<motion.div
								key={index}
								className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5 p-6 text-center"
								whileHover={{ scale: 1.02 }}
								transition={{ duration: 0.2 }}
							>
								<div className="mb-3 text-3xl">{metric.icon}</div>
								<div className="mb-1 font-bold text-2xl text-primary">
									{metric.value}
								</div>
								<h4 className="mb-2 font-semibold">{metric.label}</h4>
								<p className="text-muted-foreground text-xs">
									{metric.subtext}
								</p>
							</motion.div>
						))}
					</div>
				</FadeIn>

				{/* Social Proof */}
				<FadeIn direction="up" delay={1}>
					<div className="text-center">
						<motion.div
							className="inline-block rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-blue-500/10 p-8"
							whileHover={{ scale: 1.02 }}
							transition={{ duration: 0.2 }}
						>
							<div className="mb-4 flex items-center justify-center gap-8">
								<div className="flex items-center gap-2">
									<span className="text-2xl">⭐</span>
									<div>
										<div className="font-bold">4.9/5 Stars</div>
										<div className="text-muted-foreground text-xs">
											GitHub Reviews
										</div>
									</div>
								</div>
								<div className="h-8 w-px bg-border/50" />
								<div className="flex items-center gap-2">
									<span className="text-2xl">📦</span>
									<div>
										<div className="font-bold">100K+ Downloads</div>
										<div className="text-muted-foreground text-xs">
											NPM Weekly
										</div>
									</div>
								</div>
								<div className="h-8 w-px bg-border/50" />
								<div className="flex items-center gap-2">
									<span className="text-2xl">🚀</span>
									<div>
										<div className="font-bold">2,300+ Teams</div>
										<div className="text-muted-foreground text-xs">
											Production Use
										</div>
									</div>
								</div>
							</div>
							<h3 className="mb-3 font-bold text-xl">
								Join the Migration Safety Revolution
							</h3>
							<p className="max-w-md text-muted-foreground">
								Don't let database migrations be your biggest deployment fear.
								See why leading teams choose DriftJS Flow for production safety.
							</p>
						</motion.div>
					</div>
				</FadeIn>
			</div>
		</section>
	);
}
