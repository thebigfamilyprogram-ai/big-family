"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CoordinatorButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const res = await fetch("/api/my-role");
    if (res.status === 401) {
      router.push("/register?role=coordinator");
      return;
    }
    if (res.ok) {
      const profile = await res.json();
      router.push(profile?.role === "coordinator" ? "/coordinator" : "/dashboard");
    }
    setLoading(false);
  };

  return (
    <button onClick={handleClick} disabled={loading}
      className="inline-flex items-center gap-2 px-6 py-3 border border-[#0D0D0D] text-[#0D0D0D] font-medium text-sm tracking-tight transition-all hover:bg-[#0D0D0D] hover:text-[#F5F3EF] active:scale-[0.98] disabled:opacity-50">
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      Soy coordinador
    </button>
  );
}
