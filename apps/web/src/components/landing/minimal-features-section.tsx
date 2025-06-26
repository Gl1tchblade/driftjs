import { motion } from 'motion/react'

const features = [
  {
    title: 'safe by default',
    desc: 'built-in checks prevent downtime and data loss',
    icon: '🛡️',
  },
  {
    title: 'zero config',
    desc: 'works with your existing orm and sql tools',
    icon: '⚡',
  },
  {
    title: 'open source',
    desc: 'transparent, extensible and free to start',
    icon: '🌱',
  },
]

export default function MinimalFeaturesSection() {
  return (
    <section id="features" className="mx-auto w-full max-w-5xl px-4 py-24">
      <h2 className="mb-12 text-center text-2xl font-semibold lowercase">why driftjs?</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            viewport={{ once: true }}
            className="rounded-lg border border-border/50 p-6 text-center backdrop-blur-sm"
          >
            <div className="mb-4 text-3xl">{f.icon}</div>
            <h3 className="mb-2 font-medium lowercase">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
} 