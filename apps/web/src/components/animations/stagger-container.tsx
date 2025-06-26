import { motion } from "motion/react";
import React from "react";

interface StaggerContainerProps {
	children: React.ReactNode;
	delay?: number;
	staggerDelay?: number;
	className?: string;
}

export function StaggerContainer({
	children,
	delay = 0,
	staggerDelay = 0.1,
	className,
}: StaggerContainerProps) {
	const containerVariants = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: {
				delay,
				staggerChildren: staggerDelay,
				delayChildren: 0.1,
			},
		},
	};

	const itemVariants = {
		hidden: {
			opacity: 0,
			y: 30,
		},
		show: {
			opacity: 1,
			y: 0,
		},
	};

	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			whileInView="show"
			viewport={{ once: true, margin: "-50px" }}
			className={className}
		>
			{React.Children.map(children, (child, index) => (
				<motion.div key={index} variants={itemVariants}>
					{child}
				</motion.div>
			))}
		</motion.div>
	);
}
