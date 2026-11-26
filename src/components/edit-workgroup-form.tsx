"use client";

import { useState, type FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WorkGroup } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";

type EditWorkgroupFormProps = {
  workgroup: WorkGroup | null;
  onSubmit: (workgroup: Partial<Omit<WorkGroup, "id" | "ownerId" | "createdAt">>) => void;
  onDone: () => void;
};

export default function EditWorkgroupForm({ workgroup, onSubmit, onDone }: EditWorkgroupFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (workgroup) {
      setName(workgroup.name);
      setDescription(workgroup.description);
    }
  }, [workgroup]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert("Por favor, preencha o nome do grupo.");
      return;
    }
    
    onSubmit({ name, description });
    onDone();
  };

  if (!workgroup) {
    return (
        <div className="grid gap-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <div className="flex justify-end gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
            </div>
        </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome do Grupo</Label>
        <Input
          id="name"
          placeholder="ex: Equipe de Design"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Adicione uma breve descrição do grupo..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit">Salvar Alterações</Button>
      </div>
    </form>
  );
}
