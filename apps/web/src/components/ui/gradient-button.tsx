import type { VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import type React from "react";
import { cn } from "@/lib/utils";
import { Button, type buttonVariants } from "./button";

interface GradientButtonProps
	extends React.ComponentProps<typeof Button>,
		VariantProps<typeof buttonVariants> {
	gradient?: "primary" | "secondary" | "accent";
}

const gradientStyles = {
	primary:
		"bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-700 hover:via-purple-700 hover:to-blue-800",
	secondary:
		"bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800",
	accent:
		"bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700",
};

export function GradientButton({
	className,
	gradient = "primary",
	children,
	...props
}: GradientButtonProps) {
	return (
		<motion.div
			whileHover={{ scale: 1.02 }}
			whileTap={{ scale: 0.98 }}
			transition={{ duration: 0.2 }}
		>
			<Button
				className={cn(
					"relative overflow-hidden border-0 text-white shadow-lg",
					gradientStyles[gradient],
					"before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity hover:before:opacity-100",
					className,
				)}
				{...props}
			>
				<span className="relative z-10">{children}</span>
			</Button>
		</motion.div>
	);
}
