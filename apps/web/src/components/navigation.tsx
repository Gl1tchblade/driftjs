import { Link, useLocation } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { GradientText } from "@/components/ui/gradient-text";
import { PremiumButton } from "@/components/ui/premium-button";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Navigation() {
	const [isProductsOpen, setIsProductsOpen] = useState(false);
	const location = useLocation();

	const products = [
		{
			name: "Flow CLI",
			description: "Production-safe database migrations",
			icon: "⚡",
			href: "/flow",
			badge: "Popular",
			available: true,
		},
		{
			name: "Analytics",
			description: "Real-time migration monitoring",
			icon: "📊",
			href: "/analytics",
			badge: "Coming Soon",
			available: false,
		},
		{
			name: "Enterprise",
			description: "Advanced team collaboration",
			icon: "🏢",
			href: "/enterprise",
			badge: "Coming Soon",
			available: false,
		},
	];

	const isCurrentPath = (path: string) => location.pathname === path;

	return (
		<nav className="sticky top-0 z-50 w-full border-border/50 border-b bg-background/80 backdrop-blur-xl">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					{/* Logo */}
					<Link to="/" className="group flex items-center space-x-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
							<span className="font-bold text-sm text-white">D</span>
						</div>
						<GradientText
							variant="premium"
							className="font-bold text-xl transition-transform group-hover:scale-105"
						>
							DriftJS
						</GradientText>
					</Link>

					{/* Main Navigation */}
					<div className="hidden items-center space-x-8 md:flex">
						{/* Products Dropdown */}
						<div
							className="relative"
							onMouseEnter={() => setIsProductsOpen(true)}
							onMouseLeave={() => setIsProductsOpen(false)}
						>
							<button className="flex items-center space-x-1 py-2 text-foreground transition-colors hover:text-primary">
								<span className="font-medium">Products</span>
								<ChevronDown
									className={`h-4 w-4 transition-transform ${isProductsOpen ? "rotate-180" : ""}`}
								/>
							</button>

							<AnimatePresence>
								{isProductsOpen && (
									<motion.div
										initial={{ opacity: 0, y: 10, scale: 0.95 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										exit={{ opacity: 0, y: 10, scale: 0.95 }}
										transition={{ duration: 0.2 }}
										className="absolute top-full left-0 mt-2 w-80 rounded-2xl border border-border/50 bg-background/95 p-4 shadow-xl backdrop-blur-xl"
									>
										<div className="space-y-2">
											{products.map((product, index) =>
												product.available ? (
													<Link
														key={product.href}
														to={product.href}
														className="group block"
													>
														<motion.div
															initial={{ opacity: 0, x: -10 }}
															animate={{ opacity: 1, x: 0 }}
															transition={{ delay: index * 0.05 }}
															className="flex items-start space-x-3 rounded-xl p-3 transition-colors hover:bg-accent/50"
														>
															<div className="text-2xl">{product.icon}</div>
															<div className="flex-1">
																<div className="flex items-center space-x-2">
																	<h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">
																		{product.name}
																	</h3>
																	{product.badge && (
																		<span className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-2 py-1 text-white text-xs">
																			{product.badge}
																		</span>
																	)}
																</div>
																<p className="text-muted-foreground text-sm">
																	{product.description}
																</p>
															</div>
														</motion.div>
													</Link>
												) : (
													<div key={product.href} className="block">
														<motion.div
															initial={{ opacity: 0, x: -10 }}
															animate={{ opacity: 1, x: 0 }}
															transition={{ delay: index * 0.05 }}
															className="flex cursor-not-allowed items-start space-x-3 rounded-xl p-3 opacity-60"
														>
															<div className="text-2xl opacity-50">
																{product.icon}
															</div>
															<div className="flex-1">
																<div className="flex items-center space-x-2">
																	<h3 className="font-semibold text-muted-foreground">
																		{product.name}
																	</h3>
																	{product.badge && (
																		<span className="rounded-full bg-muted-foreground/50 px-2 py-1 text-white text-xs">
																			{product.badge}
																		</span>
																	)}
																</div>
																<p className="text-muted-foreground/70 text-sm">
																	{product.description}
																</p>
															</div>
														</motion.div>
													</div>
												),
											)}
										</div>

										<div className="mt-4 border-border/50 border-t pt-4">
											<div className="rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-3">
												<div className="flex items-center justify-between">
													<div>
														<h4 className="font-semibold text-foreground">
															Enterprise Solutions
														</h4>
														<p className="text-muted-foreground text-sm">
															Custom deployment & support
														</p>
													</div>
													<span className="text-blue-500/50">Coming Soon</span>
												</div>
											</div>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>

						{/* Other Navigation Links */}
						<span className="cursor-not-allowed font-medium text-muted-foreground/70">
							Documentation
						</span>

						<span className="cursor-not-allowed font-medium text-muted-foreground/70">
							Pricing
						</span>

						<span className="cursor-not-allowed font-medium text-muted-foreground/70">
							Blog
						</span>
					</div>

					{/* Right Side */}
					<div className="flex items-center space-x-4">
						<Link
							to="/login"
							className="hidden font-medium text-foreground transition-colors hover:text-primary sm:block"
						>
							Sign In
						</Link>

						<PremiumButton size="sm" magnetic className="hidden sm:block">
							Get Started
						</PremiumButton>

						<div className="flex items-center space-x-2">
							<ModeToggle />
							<UserMenu />
						</div>
					</div>
				</div>
			</div>
		</nav>
	);
}
