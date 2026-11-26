
"use client";

import { useState, type FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceTask, WorkGroup } from "@/lib/types";
import { useFirestore, useUser } from "@/firebase";
import { doc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type EditTaskFormProps = {
  initialData: ServiceTask;
  onDone: () => void;
  onTaskUpdate: () => void;
  workgroups: WorkGroup[];
};

const toDate = (val: any): Date | null => {
  if (!val) return null;
  if (val.toDate) return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val);
};

export default function EditTaskForm({ initialData, onDone, onTaskUpdate, workgroups }: EditTaskFormProps) {
  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [isPriority, setIsPriority] = useState(initialData.isPriority ?? false);
  const [deadlineAt, setDeadlineAt] = useState<string>(() => {
    const d = toDate(initialData.deadlineAt);
    return d ? format(d, "yyyy-MM-dd") : "";
  });
  const [selectedWorkgroups, setSelectedWorkgroups] = useState<string[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchLinkedGroups() {
      if (!firestore) return;
      const correlationId = initialData.correlationId;
      
      if (!correlationId) {
        setSelectedWorkgroups([initialData.workGroupId]);
        setIsLoadingGroups(false);
        return;
      }

      try {
        const groups: string[] = [];
        for (const wg of workgroups) {
          const q = query(
            collection(firestore, `workgroups/${wg.id}/tasks`),
            where("correlationId", "==", correlationId)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            groups.push(wg.id);
          }
        }
        setSelectedWorkgroups(Array.from(new Set(groups.length > 0 ? groups : [initialData.workGroupId])));
      } catch (e) {
        console.error("Error fetching linked groups:", e);
        setSelectedWorkgroups([initialData.workGroupId]);
      } finally {
        setIsLoadingGroups(false);
      }
    }

    fetchLinkedGroups();
  }, [firestore, initialData.correlationId, initialData.workGroupId, workgroups]);

  const handleCheckboxChange = (checked: boolean, groupId: string) => {
    setSelectedWorkgroups(prev => checked ? Array.from(new Set([...prev, groupId])) : prev.filter(id => id !== groupId));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    if (!title) {
      toast({ variant: "destructive", title: "Título obrigatório" });
      return;
    }
    if (selectedWorkgroups.length === 0) {
      toast({ variant: "destructive", title: "Selecione pelo menos um grupo" });
      return;
    }

    setIsSaving(true);
    const batch = writeBatch(firestore);
    const correlationId = initialData.correlationId || initialData.id;
    const clientTimestamp = new Date();
    
    // Define o prazo para as 18:00 (fim do expediente) do dia selecionado
    const finalDeadline = deadlineAt ? new Date(deadlineAt + "T18:00:00") : null;

    const priorityAtValue = (!initialData.isPriority && isPriority) 
      ? clientTimestamp 
      : (initialData.priorityAt || (isPriority ? initialData.createdAt : undefined));

    try {
      for (const wg of workgroups) {
        const q = query(
          collection(firestore, `workgroups/${wg.id}/tasks`),
          where("correlationId", "==", correlationId)
        );
        const snap = await getDocs(q);
        
        if (!selectedWorkgroups.includes(wg.id)) {
          snap.forEach(d => batch.delete(d.ref));
        } else {
          if (!snap.empty) {
            snap.forEach(d => {
              const updateData: any = {
                title,
                description,
                isPriority: !!isPriority,
                deadlineAt: finalDeadline
              };
              if (priorityAtValue) {
                updateData.priorityAt = priorityAtValue;
              }
              Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
              batch.update(d.ref, updateData);
            });
          } else {
            const newTaskRef = doc(collection(firestore, `workgroups/${wg.id}/tasks`));
            const newTaskPayload: any = {
              id: newTaskRef.id,
              workGroupId: wg.id,
              title,
              description,
              assignedUserId: user.uid,
              status: "Pendente",
              createdAt: initialData.createdAt || clientTimestamp,
              deadlineAt: finalDeadline,
              correlationId: correlationId,
              isPriority: !!isPriority,
              statusHistory: [
                {
                  status: "Pendente",
                  timestamp: clientTimestamp,
                  userId: user.uid,
                },
              ],
            };
            if (priorityAtValue) {
              newTaskPayload.priorityAt = priorityAtValue;
            }
            Object.keys(newTaskPayload).forEach(key => newTaskPayload[key] === undefined && delete newTaskPayload[key]);
            batch.set(newTaskRef, newTaskPayload);
          }
        }
      }

      await batch.commit();
      onTaskUpdate();
      toast({ title: "Tarefa Atualizada Universalmente" });
      onDone();
    } catch (error) {
      console.error("Error saving task:", error);
      toast({ variant: "destructive", title: "Erro ao Salvar" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingGroups) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor="title" className="text-xs font-bold uppercase opacity-60">Título</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isSaving}
          className="bg-muted/30"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description" className="text-xs font-bold uppercase opacity-60">Descrição</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSaving}
          className="bg-muted/30"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="deadline" className="text-xs font-bold uppercase opacity-60">Prazo Limite</Label>
        <div className="relative w-full">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground pointer-events-none z-10" />
          <Input
            id="deadline"
            type="date"
            value={deadlineAt}
            onChange={(e) => setDeadlineAt(e.target.value)}
            disabled={isSaving}
            className="w-full bg-muted/30 pl-10 pr-3 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center justify-between space-x-2 border p-3 rounded-md bg-muted/20">
        <div className="flex items-center gap-2">
          <AlertCircle className={cn("h-4 w-4", isPriority ? "text-primary" : "text-muted-foreground")} />
          <div className="grid gap-0.5">
            <Label htmlFor="priority-edit" className="text-sm font-semibold">Urgente</Label>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">FIFO baseado no momento da ativação</p>
          </div>
        </div>
        <Switch
          id="priority-edit"
          checked={isPriority}
          onCheckedChange={setIsPriority}
          disabled={isSaving}
        />
      </div>

      <div className="grid gap-2">
        <Label className="text-xs font-bold uppercase opacity-60">Grupos de Trabalho</Label>
        <p className="text-[10px] text-muted-foreground mb-1 italic">Status e progresso são individuais por grupo.</p>
        <ScrollArea className="h-32 rounded-md border p-3 bg-muted/10">
          <div className="space-y-2">
            {workgroups.map(wg => (
              <div key={wg.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`wg-edit-${wg.id}`}
                  checked={selectedWorkgroups.includes(wg.id)}
                  onCheckedChange={(checked) => handleCheckboxChange(checked as boolean, wg.id)}
                  disabled={isSaving}
                />
                <Label
                  htmlFor={`wg-edit-${wg.id}`}
                  className="text-xs font-medium cursor-pointer"
                >
                  {wg.name}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={isSaving} className="text-xs rounded-full">
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving} className="text-xs font-bold px-6 rounded-full">
          {isSaving ? "Gravando..." : "Salvar Alterações"}
        </Button>
      </div>
    </form>
  );
}
