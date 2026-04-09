import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { AppNav } from "@/components/shared/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col flex-1">
      <AppNav />
      <main className="flex flex-col flex-1">{children}</main>
    </div>
  );
}
