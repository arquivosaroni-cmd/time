"use client";

import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import CreateTaskForm from './create-task-form';
import type { ServiceTask, WorkGroup } from '@/lib/types';
import { User } from 'firebase/auth';
import { useFirestore } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { resetBodyPointerEvents, ensureDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";

interface TaskCreateDialogProps {
  workgroups: WorkGroup[];
  initialWorkGroupId: string | null;
  user: User;
}

export default function TaskCreateDialog({ workgroups, initialWorkGroupId, user }: TaskCreateDialogProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleAddTask = async (taskData: Pick<ServiceTask, "title" | "description" | "isPriority" | "deadlineAt">, workgroupIds: string[]) => {
    if (!firestore || !user || workgroupIds.length === 0) {
      toast({ variant: "destructive", title: "Erro ao criar" });
      return;
    }

    try {
      const batch = writeBatch(firestore);
      const clientTimestamp = new Date();
      
      const finalDeadline = ensureDate(taskData.deadlineAt);
      finalDeadline.setHours(18, 0, 0, 0);
      
      const correlationId = doc(collection(firestore, 'dummy-ids')).id;
      const uniqueGroupIds = Array.from(new Set(workgroupIds));

      uniqueGroupIds.forEach((wgId) => {
        const taskCollectionRef = collection(firestore, `workgroups/${wgId}/tasks`);
        const newTaskRef = doc(taskCollectionRef);

        const newTaskPayload: any = {
          id: newTaskRef.id,
          workGroupId: wgId,
          title: taskData.title,
          description: taskData.description,
          assignedUserId: user.uid,
          status: "Pendente",
          createdAt: clientTimestamp,
          position: clientTimestamp,
          deadlineAt: finalDeadline,
          correlationId: correlationId,
          isPriority: !!taskData.isPriority,
          deadlineNotificationSent: false,
          showStatusColor: false,
          statusHistory: [
            {
              status: "Pendente",
              timestamp: clientTimestamp,
              userId: user.uid,
            },
          ],
        };

        if (taskData.isPriority) {
          newTaskPayload.priorityAt = clientTimestamp;
        }

        Object.keys(newTaskPayload).forEach(key => newTaskPayload[key] === undefined && delete newTaskPayload[key]);

        batch.set(newTaskRef, newTaskPayload);
      });

      await batch.commit();
      toast({ title: "Tarefa Criada Universalmente!" });
      setIsOpen(false);
    } catch (error) {
      console.error("Erro ao adicionar:", error);
      toast({ variant: "destructive", title: "Erro ao criar tarefa" });
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) setTimeout(resetBodyPointerEvents, 100);
  };

  const form = (
    <CreateTaskForm
      onSubmit={handleAddTask}
      onDone={() => handleOpenChange(false)}
      workgroups={workgroups}
      initialWorkGroupId={initialWorkGroupId}
    />
  );

  const triggerButton = (
    <Button 
      size="icon" 
      className="shrink-0 rounded-full h-11 w-11 sm:h-9 sm:w-auto sm:px-6 font-bold text-xs uppercase tracking-widest"
    >
      <Plus className={cn("h-5 w-5", "sm:mr-2 sm:h-3.5 sm:w-3.5")} />
      <span className="hidden sm:inline">Nova Tarefa</span>
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader className="text-left">
            <SheetTitle>Nova Tarefa</SheetTitle>
            <SheetDescription>Preencha os detalhes da tarefa.</SheetDescription>
          </SheetHeader>
          <div className="py-4">{form}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
          <DialogDescription>Preencha os detalhes da tarefa.</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
