
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceTask, WorkGroup } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";

type CreateTaskFormProps = {
  onSubmit: (task: Pick<ServiceTask, "title" | "description" | "isPriority" | "deadlineAt">, workgroupIds: string[]) => void;
  onDone: () => void;
  workgroups: WorkGroup[];
  initialWorkGroupId?: string | null;
};

export default function CreateTaskForm({ onSubmit, onDone, workgroups, initialWorkGroupId }: CreateTaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPriority, setIsPriority] = useState(false);
  
  // Calcula a próxima sexta-feira como padrão
  const [deadlineAt, setDeadlineAt] = useState<string>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    return format(addDays(today, daysUntilFriday), "yyyy-MM-dd");
  });

  const [selectedWorkgroups, setSelectedWorkgroups] = useState<string[]>(initialWorkGroupId ? [initialWorkGroupId] : []);
  const { toast } = useToast();

  const handleCheckboxChange = (checked: boolean, groupId: string) => {
    setSelectedWorkgroups(prev => {
      if (checked) {
        return [...prev, groupId];
      } else {
        return prev.filter(id => id !== groupId);
      }
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast({
        variant: "destructive",
        title: "Título obrigatório",
        description: "Por favor, preencha o título da tarefa.",
      });
      return;
    }
    if (selectedWorkgroups.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum grupo selecionado",
        description: "Por favor, selecione pelo menos um grupo de trabalho.",
      });
      return;
    }
    
    // Define o prazo para as 18:00 (fim do expediente) do dia selecionado
    const deadlineDate = new Date(deadlineAt + "T18:00:00");

    onSubmit({ 
      title, 
      description, 
      isPriority, 
      deadlineAt: deadlineDate 
    }, selectedWorkgroups);
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor="title" className="text-xs font-bold uppercase opacity-60">Título</Label>
        <Input
          id="title"
          placeholder="ex: Criar novo logo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description" className="text-xs font-bold uppercase opacity-60">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Adicione uma breve descrição da tarefa..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="deadline" className="text-xs font-bold uppercase opacity-60">Prazo Limite (Sexta-feira)</Label>
        <div className="relative w-full">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground pointer-events-none z-10" />
          <Input
            id="deadline"
            type="date"
            value={deadlineAt}
            onChange={(e) => setDeadlineAt(e.target.value)}
            className="w-full bg-muted/30 pl-10 pr-3 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center justify-between space-x-2 border p-3 rounded-md bg-muted/20">
        <div className="flex items-center gap-2">
          <AlertCircle className={`h-4 w-4 ${isPriority ? "text-primary" : "text-muted-foreground"}`} />
          <div className="grid gap-0.5">
            <Label htmlFor="priority" className="text-sm font-semibold">Urgente</Label>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">FIFO baseado no momento da ativação</p>
          </div>
        </div>
        <Switch
          id="priority"
          checked={isPriority}
          onCheckedChange={setIsPriority}
        />
      </div>

      <div className="grid gap-2">
        <Label className="text-xs font-bold uppercase opacity-60">Grupos de Trabalho</Label>
        <ScrollArea className="h-40 rounded-md border p-4">
          <div className="space-y-2">
            {workgroups.map(wg => (
              <div key={wg.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`wg-${wg.id}`}
                  checked={selectedWorkgroups.includes(wg.id)}
                  onCheckedChange={(checked) => handleCheckboxChange(checked as boolean, wg.id)}
                />
                <Label
                  htmlFor={`wg-${wg.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {wg.name}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} className="rounded-full">
          Cancelar
        </Button>
        <Button type="submit" className="rounded-full">Criar Tarefa</Button>
      </div>
    </form>
  );
}
