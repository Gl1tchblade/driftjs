import { motion } from 'motion/react'

export default function MinimalFooter() {
	const currentYear = new Date().getFullYear();
	return (
		<footer className="border-t border-border/50 py-10 text-center text-sm text-muted-foreground">
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.4 }}
			>
				© {currentYear} driftjs • built with love for developers
			</motion.div>
		</footer>
	);
} 