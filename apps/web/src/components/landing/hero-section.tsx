import { motion } from "motion/react";
import { AmbientBackground } from "@/components/ambient-background";
import { FadeIn } from "@/components/animations/fade-in";
import { StaggerContainer } from "@/components/animations/stagger-container";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { GradientButton } from "@/components/ui/gradient-button";
import { GradientText } from "@/components/ui/gradient-text";
import { PremiumButton } from "@/components/ui/premium-button";
import { PremiumCard } from "@/components/ui/premium-card";

export function HeroSection() {
	const installCommand = `npm install @driftjs/flow
flow init
flow sync --dry-run`;

	return (
		<section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
			{/* Premium Ambient Background */}
			<AmbientBackground variant="hero" />

			{/* Subtle overlay for better text readability */}
			<div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/60 to-background/80" />

			<div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
				{/* Content Column */}
				<div className="space-y-8">
					<FadeIn direction="up" delay={0.2}>
						<div className="glass-effect inline-flex items-center rounded-full px-4 py-2 text-sm backdrop-blur-md">
							<span className="mr-3 h-2 w-2 animate-pulse rounded-full bg-gradient-to-r from-green-400 to-emerald-500" />
							<span className="font-medium">
								Production-ready database migrations
							</span>
						</div>
					</FadeIn>

					<StaggerContainer delay={0.4} staggerDelay={0.1}>
						<h1 className="font-bold text-5xl leading-tight tracking-tight lg:text-7xl">
							Stop Getting
							<GradientText
								as="span"
								variant="aurora"
								className="mt-2 block text-5xl lg:text-7xl"
							>
								3AM Emergency Calls
							</GradientText>
						</h1>

						<p className="max-w-2xl font-light text-muted-foreground text-xl leading-relaxed lg:text-2xl">
							DriftJS Flow enhances your existing ORM migrations with
							production-safety features, automated rollback strategies, and
							zero-downtime deployment capabilities.
						</p>

						<div className="flex flex-col gap-4 pt-8 sm:flex-row">
							<PremiumButton
								size="lg"
								glow
								magnetic
								className="px-10 py-4 text-lg shadow-xl"
							>
								Get Started Free
							</PremiumButton>
							<Button
								variant="outline"
								size="lg"
								className="border-2 px-10 py-4 text-lg transition-all duration-300 hover:border-purple-500/50 hover:bg-purple-500/5"
							>
								View Documentation
							</Button>
						</div>

						<div className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:gap-8">
							<div className="flex items-center gap-3 text-sm">
								<div className="h-3 w-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-green-400/30 shadow-lg" />
								<span className="font-medium text-foreground">
									Works with Prisma, Drizzle, TypeORM
								</span>
							</div>
							<div className="flex items-center gap-3 text-sm">
								<div className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 shadow-blue-400/30 shadow-lg" />
								<span className="font-medium text-foreground">
									Zero configuration required
								</span>
							</div>
						</div>
					</StaggerContainer>
				</div>

				{/* Code Demo Column */}
				<FadeIn direction="left" delay={0.8}>
					<div className="relative">
						{/* Premium glow effect */}
						<motion.div
							className="-inset-6 absolute rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-2xl"
							animate={{
								opacity: [0.4, 0.8, 0.4],
								scale: [1, 1.05, 1],
							}}
							transition={{
								duration: 6,
								repeat: Number.POSITIVE_INFINITY,
								ease: "easeInOut",
							}}
						/>

						<PremiumCard variant="glass" className="relative backdrop-blur-xl">
							<CodeBlock
								title="Quick Start"
								code={installCommand}
								language="bash"
								className="border-none bg-transparent shadow-none"
							/>

							<motion.div
								className="glass-effect mt-6 rounded-xl border border-green-400/20 bg-green-400/5 p-4"
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ delay: 1.2, duration: 0.6 }}
								viewport={{ once: true }}
							>
								<div className="flex items-center gap-3">
									<div className="flex items-center gap-2">
										<div className="h-3 w-3 animate-pulse rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-green-400/50 shadow-lg" />
										<span className="font-semibold text-green-400 text-sm">
											Migration Safety Verified
										</span>
									</div>
									<div className="h-4 w-px bg-green-400/30" />
									<span className="text-green-300/80 text-sm">
										Ready for production
									</span>
								</div>
							</motion.div>
						</PremiumCard>
					</div>
				</FadeIn>
			</div>

			{/* Premium scroll indicator */}
			<motion.div
				className="-translate-x-1/2 absolute bottom-12 left-1/2 transform"
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 2, duration: 0.6 }}
			>
				<motion.div
					className="glass-effect flex h-12 w-7 justify-center rounded-full border-2 border-gradient-to-b from-purple-400/60 to-blue-400/40"
					animate={{ y: [0, 10, 0] }}
					transition={{
						duration: 3,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					}}
				>
					<motion.div
						className="mt-2 h-4 w-1.5 rounded-full bg-gradient-to-b from-purple-400 to-blue-400 shadow-lg shadow-purple-400/50"
						animate={{
							opacity: [0.4, 1, 0.4],
							scale: [1, 1.2, 1],
						}}
						transition={{
							duration: 3,
							repeat: Number.POSITIVE_INFINITY,
							ease: "easeInOut",
						}}
					/>
				</motion.div>
			</motion.div>
		</section>
	);
}
