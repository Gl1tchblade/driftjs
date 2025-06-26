import { motion } from "motion/react";
import { FadeIn } from "@/components/animations/fade-in";
import { StaggerContainer } from "@/components/animations/stagger-container";
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";

export function LandingFooter() {
	const footerSections = {
		product: {
			title: "Product",
			links: [
				{ label: "Features", href: "#features" },
				{ label: "How It Works", href: "#how-it-works" },
				{ label: "Pricing", href: "#pricing" },
				{ label: "Integrations", href: "#integrations" },
				{ label: "Changelog", href: "/changelog" },
				{ label: "Roadmap", href: "/roadmap" },
			],
		},
		developers: {
			title: "Developers",
			links: [
				{ label: "Documentation", href: "/docs" },
				{ label: "API Reference", href: "/api" },
				{ label: "CLI Reference", href: "/cli" },
				{ label: "Examples", href: "/examples" },
				{ label: "GitHub", href: "https://github.com/driftjs/flow" },
				{
					label: "NPM Package",
					href: "https://npmjs.com/package/@driftjs/flow",
				},
			],
		},
		resources: {
			title: "Resources",
			links: [
				{ label: "Blog", href: "/blog" },
				{ label: "Case Studies", href: "/case-studies" },
				{ label: "Migration Guide", href: "/migration-guide" },
				{ label: "Best Practices", href: "/best-practices" },
				{ label: "Community", href: "/community" },
				{ label: "Support", href: "/support" },
			],
		},
		company: {
			title: "Company",
			links: [
				{ label: "About", href: "/about" },
				{ label: "Team", href: "/team" },
				{ label: "Careers", href: "/careers" },
				{ label: "Contact", href: "/contact" },
				{ label: "Privacy Policy", href: "/privacy" },
				{ label: "Terms of Service", href: "/terms" },
			],
		},
	};

	const socialLinks = [
		{
			platform: "GitHub",
			icon: "🐙",
			href: "https://github.com/driftjs/flow",
			username: "@driftjs",
		},
		{
			platform: "Twitter",
			icon: "🐦",
			href: "https://twitter.com/driftjs",
			username: "@driftjs",
		},
		{
			platform: "Discord",
			icon: "💬",
			href: "https://discord.gg/driftjs",
			username: "Join our community",
		},
		{
			platform: "LinkedIn",
			icon: "🔗",
			href: "https://linkedin.com/company/driftjs",
			username: "Follow us",
		},
	];

	const quickStats = [
		{ value: "50k+", label: "Migrations Protected" },
		{ value: "2.3k+", label: "Teams Using DriftJS" },
		{ value: "99.9%", label: "Uptime Achieved" },
		{ value: "0", label: "Data Loss Incidents" },
	];

	return (
		<footer className="relative border-border/50 border-t bg-gradient-to-b from-background to-muted/50">
			<div className="mx-auto max-w-7xl px-4">
				{/* Main Footer Content */}
				<div className="py-16">
					<FadeIn direction="up">
						{/* Footer Header */}
						<div className="mb-16 text-center">
							<h2 className="mb-4 font-bold text-3xl">
								Ready to Transform Your
								<span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
									Database Operations?
								</span>
							</h2>
							<p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
								Join thousands of developers who've eliminated deployment
								anxiety and 3 AM alerts from their workflow with DriftJS Flow.
							</p>
							<div className="flex flex-col justify-center gap-4 sm:flex-row">
								<GradientButton size="lg" className="gap-2">
									<span>🚀</span>
									Get Started Free
								</GradientButton>
								<Button variant="outline" size="lg" className="gap-2">
									<span>📚</span>
									Read Documentation
								</Button>
							</div>
						</div>
					</FadeIn>

					{/* Quick Stats */}
					<FadeIn direction="up" delay={0.2}>
						<div className="mb-16 grid grid-cols-2 gap-8 rounded-2xl border border-border/30 bg-gradient-to-br from-muted/30 to-muted/10 p-8 md:grid-cols-4">
							{quickStats.map((stat, index) => (
								<motion.div
									key={index}
									className="text-center"
									whileHover={{ scale: 1.05 }}
									transition={{ duration: 0.2 }}
								>
									<div className="mb-1 font-bold text-2xl text-primary">
										{stat.value}
									</div>
									<div className="text-muted-foreground text-sm">
										{stat.label}
									</div>
								</motion.div>
							))}
						</div>
					</FadeIn>

					{/* Footer Links */}
					<StaggerContainer staggerDelay={0.1}>
						<div className="mb-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
							{Object.entries(footerSections).map(([key, section]) => (
								<div key={key}>
									<h3 className="mb-4 font-semibold text-foreground">
										{section.title}
									</h3>
									<ul className="space-y-3">
										{section.links.map((link, index) => (
											<li key={index}>
												<motion.a
													href={link.href}
													className="text-muted-foreground text-sm transition-colors duration-200 hover:text-primary"
													whileHover={{ x: 2 }}
													transition={{ duration: 0.1 }}
												>
													{link.label}
												</motion.a>
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					</StaggerContainer>

					{/* Newsletter Signup */}
					<FadeIn direction="up" delay={0.4}>
						<div className="mb-16 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5 p-8 text-center">
							<h3 className="mb-3 font-bold text-xl">Stay Updated</h3>
							<p className="mb-6 text-muted-foreground">
								Get the latest updates on new features, best practices, and
								migration tips.
							</p>
							<div className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row">
								<input
									type="email"
									placeholder="Enter your email"
									className="flex-1 rounded-lg border border-border/50 bg-background/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
								/>
								<Button className="gap-2">
									<span>📧</span>
									Subscribe
								</Button>
							</div>
							<p className="mt-2 text-muted-foreground text-xs">
								No spam, unsubscribe at any time. Privacy-first approach.
							</p>
						</div>
					</FadeIn>

					{/* Social Links */}
					<FadeIn direction="up" delay={0.6}>
						<div className="mb-16 text-center">
							<h3 className="mb-6 font-semibold text-lg">Connect With Us</h3>
							<div className="flex flex-wrap justify-center gap-4">
								{socialLinks.map((social, index) => (
									<motion.a
										key={index}
										href={social.href}
										className="flex items-center gap-3 rounded-xl border border-border/30 bg-gradient-to-br from-muted/30 to-muted/10 px-4 py-3 transition-all duration-200 hover:border-primary/30"
										whileHover={{ scale: 1.05, y: -2 }}
										transition={{ duration: 0.2 }}
									>
										<span className="text-xl">{social.icon}</span>
										<div className="text-left">
											<div className="font-medium text-sm">
												{social.platform}
											</div>
											<div className="text-muted-foreground text-xs">
												{social.username}
											</div>
										</div>
									</motion.a>
								))}
							</div>
						</div>
					</FadeIn>
				</div>

				{/* Bottom Bar */}
				<div className="border-border/50 border-t py-8">
					<div className="flex flex-col items-center justify-between gap-4 md:flex-row">
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								<span className="text-2xl">🌊</span>
								<span className="font-bold text-lg">DriftJS Flow</span>
							</div>
							<div className="text-muted-foreground text-sm">
								© {new Date().getFullYear()} DriftJS. All rights reserved.
							</div>
						</div>

						<div className="flex items-center gap-6 text-muted-foreground text-sm">
							<span>Made with ❤️ for developers</span>
							<span>•</span>
							<span>Version 1.0.0</span>
							<span>•</span>
							<a
								href="/status"
								className="transition-colors hover:text-primary"
							>
								Status
							</a>
						</div>
					</div>
				</div>
			</div>

			{/* Background Decoration */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="-bottom-32 -left-32 absolute h-64 w-64 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-3xl" />
				<div className="-bottom-32 -right-32 absolute h-64 w-64 rounded-full bg-gradient-to-r from-green-500/10 to-blue-500/10 blur-3xl" />
			</div>
		</footer>
	);
}
