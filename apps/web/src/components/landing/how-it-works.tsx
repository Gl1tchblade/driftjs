import { motion } from "motion/react";
import { FadeIn } from "@/components/animations/fade-in";
import { StaggerContainer } from "@/components/animations/stagger-container";
import { Card, CardContent } from "@/components/ui/card";
import { CodeBlock } from "@/components/ui/code-block";

export function HowItWorks() {
	const steps = [
		{
			number: "01",
			title: "Initialize & Sync",
			description:
				"Set up DriftJS Flow in your existing project and sync your current migration state. Works with any existing ORM setup.",
			command: "npx @driftjs/flow init\nnpx @driftjs/flow sync",
			icon: "🚀",
			color: "from-blue-500 to-cyan-500",
		},
		{
			number: "02",
			title: "Test & Validate",
			description:
				"Run comprehensive safety checks and test your migrations against production-like scenarios before deployment.",
			command:
				"npx @driftjs/flow test\nnpx @driftjs/flow validate --env production",
			icon: "🧪",
			color: "from-purple-500 to-pink-500",
		},
		{
			number: "03",
			title: "Deploy Safely",
			description:
				"Execute migrations with real-time monitoring, automatic rollbacks, and zero-downtime deployment strategies.",
			command:
				"npx @driftjs/flow apply --safe\nnpx @driftjs/flow monitor --live",
			icon: "🛡️",
			color: "from-green-500 to-emerald-500",
		},
	];

	const benefits = [
		"No changes to existing migration files",
		"Works with your current ORM workflow",
		"Backward compatible with all tools",
		"5-minute setup, instant protection",
	];

	return (
		<section className="bg-gradient-to-b from-background to-muted/30 px-4 py-24">
			<div className="mx-auto max-w-7xl">
				<FadeIn direction="up" className="mb-16 text-center">
					<h2 className="mb-6 font-bold text-3xl lg:text-5xl">
						Three Steps to
						<span className="block bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
							Migration Peace of Mind
						</span>
					</h2>
					<p className="mx-auto max-w-3xl text-muted-foreground text-xl">
						DriftJS Flow seamlessly integrates with your existing workflow. No
						migration rewrites, no learning curve, just instant production
						safety.
					</p>
				</FadeIn>

				{/* Process Steps */}
				<div className="mb-16 space-y-12">
					{steps.map((step, index) => (
						<FadeIn
							key={index}
							direction={index % 2 === 0 ? "right" : "left"}
							delay={index * 0.2}
						>
							<div
								className={`grid items-center gap-12 lg:grid-cols-2 ${index % 2 === 1 ? "lg:grid-flow-col-dense" : ""}`}
							>
								{/* Content */}
								<div
									className={`space-y-6 ${index % 2 === 1 ? "lg:col-start-2" : ""}`}
								>
									<div className="flex items-center gap-4">
										<motion.div
											className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center font-bold text-white text-xl`}
											whileHover={{ scale: 1.1, rotate: 5 }}
											transition={{ duration: 0.2 }}
										>
											{step.number}
										</motion.div>
										<div>
											<h3 className="mb-2 font-bold text-2xl">{step.title}</h3>
											<div className="flex items-center gap-2">
												<span className="text-3xl">{step.icon}</span>
											</div>
										</div>
									</div>
									<p className="text-lg text-muted-foreground leading-relaxed">
										{step.description}
									</p>

									{/* Interactive Feature Highlights */}
									{index === 0 && (
										<StaggerContainer staggerDelay={0.1}>
											<div className="space-y-3">
												<div className="flex items-center gap-3 text-muted-foreground text-sm">
													<div className="h-2 w-2 rounded-full bg-blue-500" />
													<span>Auto-detects existing ORM configuration</span>
												</div>
												<div className="flex items-center gap-3 text-muted-foreground text-sm">
													<div className="h-2 w-2 rounded-full bg-blue-500" />
													<span>Creates secure backup of current state</span>
												</div>
												<div className="flex items-center gap-3 text-muted-foreground text-sm">
													<div className="h-2 w-2 rounded-full bg-blue-500" />
													<span>
														Establishes baseline for future migrations
													</span>
												</div>
											</div>
										</StaggerContainer>
									)}

									{index === 1 && (
										<StaggerContainer staggerDelay={0.1}>
											<div className="space-y-3">
												<div className="flex items-center gap-3 text-muted-foreground text-sm">
													<div className="h-2 w-2 rounded-full bg-purple-500" />
													<span>Static analysis for dangerous operations</span>
												</div>
												<div className="flex items-center gap-3 text-muted-foreground text-sm">
													<div className="h-2 w-2 rounded-full bg-purple-500" />
													<span>Performance impact predictions</span>
												</div>
												<div className="flex items-center gap-3 text-muted-foreground text-sm">
													<div className="h-2 w-2 rounded-full bg-purple-500" />
													<span>Rollback strategy validation</span>
												</div>
											</div>
										</StaggerContainer>
									)}

									{index === 2 && (
										<StaggerContainer staggerDelay={0.1}>
											<div className="space-y-3">
												<div className="flex items-center gap-3 text-muted-foreground text-sm">
													<div className="h-2 w-2 rounded-full bg-green-500" />
													<span>Real-time execution monitoring</span>
												</div>
												<div className="flex items-center gap-3 text-muted-foreground text-sm">
													<div className="h-2 w-2 rounded-full bg-green-500" />
													<span>Automatic failure recovery</span>
												</div>
												<div className="flex items-center gap-3 text-muted-foreground text-sm">
													<div className="h-2 w-2 rounded-full bg-green-500" />
													<span>Post-deployment verification</span>
												</div>
											</div>
										</StaggerContainer>
									)}
								</div>

								{/* Code Block */}
								<div className={`${index % 2 === 1 ? "lg:col-start-1" : ""}`}>
									<motion.div
										whileHover={{ scale: 1.02 }}
										transition={{ duration: 0.2 }}
									>
										<CodeBlock
											code={step.command}
											language="sh"
											className="border border-border/50 bg-gradient-to-br from-muted/50 to-muted/20"
										/>
									</motion.div>
								</div>
							</div>
						</FadeIn>
					))}
				</div>

				{/* Connection Flow Animation */}
				<FadeIn direction="up" delay={0.6}>
					<div className="relative">
						<div className="absolute inset-0 flex items-center justify-center">
							<motion.div
								className="h-24 w-px bg-gradient-to-b from-transparent via-primary to-transparent"
								initial={{ scaleY: 0 }}
								whileInView={{ scaleY: 1 }}
								transition={{ duration: 1 }}
								viewport={{ once: true }}
							/>
						</div>
						<motion.div
							className="relative z-10 mx-auto w-fit rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-purple-500/10 p-6"
							whileHover={{ scale: 1.02 }}
							transition={{ duration: 0.2 }}
						>
							<h3 className="mb-4 text-center font-bold text-xl">
								The Result: Bulletproof Database Operations
							</h3>
							<div className="grid gap-6 md:grid-cols-2">
								{benefits.map((benefit, index) => (
									<motion.div
										key={index}
										className="flex items-center gap-3"
										initial={{ opacity: 0, x: -10 }}
										whileInView={{ opacity: 1, x: 0 }}
										transition={{ delay: index * 0.1 }}
										viewport={{ once: true }}
									>
										<div className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
										<span className="text-muted-foreground text-sm">
											{benefit}
										</span>
									</motion.div>
								))}
							</div>
						</motion.div>
					</div>
				</FadeIn>

				{/* Bottom CTA */}
				<FadeIn direction="up" delay={0.8} className="mt-16 text-center">
					<motion.div
						className="inline-block rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-blue-500/10 p-8"
						whileHover={{ scale: 1.02 }}
						transition={{ duration: 0.2 }}
					>
						<h3 className="mb-4 font-bold text-2xl">
							Ready in Under 5 Minutes
						</h3>
						<p className="mb-6 max-w-md text-muted-foreground">
							No complex setup, no migration rewrites. Just add DriftJS Flow and
							transform your deployment confidence instantly.
						</p>
						<motion.div
							className="font-medium text-green-600 text-sm dark:text-green-400"
							animate={{ opacity: [0.7, 1, 0.7] }}
							transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
						>
							↓ See the code comparison ↓
						</motion.div>
					</motion.div>
				</FadeIn>
			</div>
		</section>
	);
}
