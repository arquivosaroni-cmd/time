
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

export const useSelectedWorkgroup = () => {
  const [selectedWorkGroupId, setSelectedWorkGroupId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const lastViewedGroupId = localStorage.getItem("lastViewedWorkGroupId");
      if (lastViewedGroupId) {
        setSelectedWorkGroupId(lastViewedGroupId);
      }
    } catch (error) {
      console.error("Erro ao ler grupo selecionado do localStorage:", error);
    }
  }, []);

  const handleWorkGroupChange = useCallback((id: string | null) => {
    setSelectedWorkGroupId(id);
    if (id) {
      try {
        localStorage.setItem("lastViewedWorkGroupId", id);
      } catch (error) {
        console.error("Erro ao salvar grupo selecionado no localStorage:", error);
      }
      // If we are not on the main page, navigate there when a group is selected.
      if (pathname !== '/') {
        router.push('/');
      }
    } else {
      try {
        localStorage.removeItem("lastViewedWorkGroupId");
      } catch (error) {
        console.error("Erro ao remover grupo selecionado do localStorage:", error);
      }
    }
  }, [pathname, router]);

  return { selectedWorkGroupId, handleWorkGroupChange };
};
