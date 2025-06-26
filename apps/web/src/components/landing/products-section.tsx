interface Product {
  name: string
  description: string
  href: string
}

const products: Product[] = [
  {
    name: 'flow',
    description: 'zero-downtime sql migrations',
    href: '/flow',
  },
  {
    name: 'sync',
    description: 'keep schemas in sync across envs',
    href: '#',
  },
  {
    name: 'monitor',
    description: 'watch prod and alert on drift',
    href: '#',
  },
]

export function ProductsSection() {
  return (
    <section id="products" className="mx-auto w-full max-w-5xl px-4 py-20">
      <h2 className="mb-8 text-center text-2xl font-semibold lowercase">our toolkit</h2>

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {products.map((p) => (
          <a
            key={p.name}
            href={p.href}
            className="group rounded-lg border bg-background/60 p-6 transition-colors hover:bg-background/80"
          >
            <div className="mb-2 text-lg font-medium lowercase group-hover:underline">
              {p.name}
            </div>
            <p className="text-sm text-muted-foreground">{p.description}</p>
          </a>
        ))}
      </div>
    </section>
  )
} 