import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	head: () => ({
		meta: [
			{ title: "Dashboard — DriftJS" },
			{ name: "robots", content: "noindex" },
		],
	}),
});

function RouteComponent() {
	const { data: session, isPending } = authClient.useSession();

	const navigate = Route.useNavigate();

	const privateData = useQuery(trpc.privateData.queryOptions());

	useEffect(() => {
		if (!session && !isPending) {
			navigate({
				to: "/login",
			});
		}
	}, [session, isPending]);

	if (isPending) {
		return <div>Loading...</div>;
	}

	return (
		<div>
			<h1>Dashboard</h1>
			<p>Welcome {session?.user.name}</p>
			<p>privateData: {privateData.data?.message}</p>
		</div>
	);
}
