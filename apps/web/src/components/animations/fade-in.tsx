import { motion } from "motion/react";
import type React from "react";

interface FadeInProps {
	children: React.ReactNode;
	delay?: number;
	duration?: number;
	direction?: "up" | "down" | "left" | "right";
	className?: string;
}

export function FadeIn({
	children,
	delay = 0,
	duration = 0.6,
	direction = "up",
	className,
}: FadeInProps) {
	const directions = {
		up: { y: 30 },
		down: { y: -30 },
		left: { x: 30 },
		right: { x: -30 },
	};

	return (
		<motion.div
			initial={{
				opacity: 0,
				...directions[direction],
			}}
			whileInView={{
				opacity: 1,
				x: 0,
				y: 0,
			}}
			viewport={{ once: true, margin: "-50px" }}
			transition={{
				duration,
				delay,
				ease: [0.21, 1.11, 0.81, 0.99],
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
}
