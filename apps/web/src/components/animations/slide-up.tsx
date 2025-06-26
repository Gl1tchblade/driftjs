import { motion } from "motion/react";
import type React from "react";

interface SlideUpProps {
	children: React.ReactNode;
	delay?: number;
	duration?: number;
	distance?: number;
	className?: string;
}

export function SlideUp({
	children,
	delay = 0,
	duration = 0.6,
	distance = 60,
	className,
}: SlideUpProps) {
	return (
		<motion.div
			initial={{
				opacity: 0,
				y: distance,
			}}
			whileInView={{
				opacity: 1,
				y: 0,
			}}
			viewport={{ once: true, margin: "-100px" }}
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
