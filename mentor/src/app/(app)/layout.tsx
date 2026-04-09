import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { AppNav } from "@/components/shared/app-nav";
import { MobileNav } from "@/components/shared/mobile-nav";

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
      <div className="hidden md:block">
        <AppNav />
      </div>
      <main className="flex flex-col flex-1 pb-14 md:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
