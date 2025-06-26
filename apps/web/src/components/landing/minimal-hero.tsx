import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'

/**
 * A super–simple hero section that focuses on clarity and speed.
 * All copy is lowercase by design (requested minimal style).
 */
export function MinimalHero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex min-h-screen w-full items-center justify-center px-4 pb-20 text-center"
    >
      <div className="w-full max-w-2xl space-y-8">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          <span className="gradient-text-static lowercase">driftjs</span>
          <span className="block font-normal text-muted-foreground">building tools developers love</span>
        </h1>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <Button variant="outline" size="lg" className="w-48 lowercase">
            get started
          </Button>
          <Button variant="outline" size="lg" className="w-48 lowercase">
            view docs
          </Button>
        </div>
      </div>
    </motion.section>
  )
} 