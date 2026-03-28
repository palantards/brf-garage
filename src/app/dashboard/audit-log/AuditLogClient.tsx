"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const FILTERS = [
  { key: "all",       label: "Alla" },
  { key: "queue",     label: "Kö" },
  { key: "offers",    label: "Erbjudanden" },
  { key: "spots",     label: "Platser" },
  { key: "residents", label: "Boende" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function AuditLogClient({
  filter,
  page,
  totalPages,
  children,
}: {
  filter: FilterKey;
  page: number;
  totalPages: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(nextFilter: string, nextPage: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("filter", nextFilter);
    p.set("page", String(nextPage));
    router.push(`/dashboard/audit-log?${p.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => navigate(f.key, 1)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors"
              style={{
                backgroundColor: active ? "#0053db" : "transparent",
                color: active ? "#fff" : "#586064",
                border: active ? "1.5px solid #0053db" : "1.5px solid #abb3b7",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Table content passed from server */}
      {children}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            className="rounded-lg border-[#abb3b7]/40 text-[#586064] font-semibold"
            disabled={page <= 1}
            onClick={() => navigate(filter, page - 1)}
          >
            <span className="material-symbols-outlined text-[18px] mr-1">chevron_left</span>
            Föregående
          </Button>
          <span className="text-sm text-[#586064] font-medium">
            Sida <span className="font-bold text-[#2b3437]">{page}</span> av {totalPages}
          </span>
          <Button
            variant="outline"
            className="rounded-lg border-[#abb3b7]/40 text-[#586064] font-semibold"
            disabled={page >= totalPages}
            onClick={() => navigate(filter, page + 1)}
          >
            Nästa
            <span className="material-symbols-outlined text-[18px] ml-1">chevron_right</span>
          </Button>
        </div>
      )}
    </div>
  );
}
