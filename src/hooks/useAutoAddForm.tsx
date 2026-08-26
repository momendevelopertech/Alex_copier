"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function AddParamHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      const event = new CustomEvent("erp-open-add");
      window.dispatchEvent(event);
      const path = window.location.pathname;
      router.replace(path, { scroll: false });
    }
  }, [searchParams, router]);

  return null;
}

export function useAutoAddForm() {
  const [shouldOpen, setShouldOpen] = useState(false);

  useEffect(() => {
    const handler = () => setShouldOpen(true);
    window.addEventListener("erp-open-add", handler);
    return () => window.removeEventListener("erp-open-add", handler);
  }, []);

  return shouldOpen;
}

export function AddFormBoundary() {
  return (
    <Suspense fallback={null}>
      <AddParamHandler />
    </Suspense>
  );
}
