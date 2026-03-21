import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DashboardSidebar from "./DashboardSidebar";
import SignOutButton from "./SignOutButton";
import { DashboardHeaderProvider } from "./DashboardHeaderContext";
import DashboardHeaderSlot from "./DashboardHeaderSlot";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { user } = session;
  const isAdmin = user.role === "admin";
  const initials = user.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <DashboardHeaderProvider>
      <div className="min-h-screen bg-[#f8f9fa] font-[var(--font-inter)] text-[#2b3437]">
        {/* Top nav */}
        <header className="fixed top-0 left-0 w-full h-16 z-50 bg-[#f1f4f6] border-b border-black/5 flex items-center px-8 box-border gap-4">
          <span className="font-[var(--font-manrope)] font-bold text-xl text-[#2b3437] tracking-tight shrink-0">
            BRF Garage
          </span>

          {/* Page-specific search + action (filled by each page's client wrapper) */}
          <DashboardHeaderSlot />

          <div className="flex items-center gap-4 pl-6 border-l border-[#abb3b7]/30 shrink-0">
            <span className="text-sm font-medium text-[#2b3437]">
              {user.name ?? user.email}
            </span>
            <SignOutButton />
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-[#dbe4e7] text-[#2b3437] text-xs font-bold font-[var(--font-manrope)]">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Body */}
        <div className="flex">
          <DashboardSidebar isAdmin={isAdmin} />
          <main className="ml-64 pt-16 flex-1 min-h-screen">
            {children}
          </main>
        </div>
      </div>
    </DashboardHeaderProvider>
  );
}
