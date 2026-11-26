"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WorkGroup } from "@/lib/types";

type CreateWorkgroupFormProps = {
  onSubmit: (workgroup: Omit<WorkGroup, "id" | "ownerId" | "createdAt">) => void;
  onDone: () => void;
};

export default function CreateWorkgroupForm({ onSubmit, onDone }: CreateWorkgroupFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert("Por favor, preencha o nome do grupo.");
      return;
    }
    
    onSubmit({ name, description });
    // onDone is called by the parent component after submission logic
  };

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
        <Button type="submit">Criar Grupo</Button>
      </div>
    </form>
  );
}
