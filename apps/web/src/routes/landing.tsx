import { createFileRoute, redirect } from "@tanstack/react-router";
import { MinimalHero } from '@/components/landing/minimal-hero'
import { ProductsSection } from '@/components/landing/products-section'
import MinimalFooter from '@/components/landing/minimal-footer'
import MinimalNavigation from "@/components/minimal-navigation";

function LandingPage() {
	return (
		<div className="min-h-screen bg-background">
			<MinimalNavigation />
			<MinimalHero />
			<ProductsSection />
			<MinimalFooter />
		</div>
	);
}

export const Route = createFileRoute("/landing")({
	beforeLoad: () => {
		throw redirect({ to: "/" });
	},
	component: () => null,
});
