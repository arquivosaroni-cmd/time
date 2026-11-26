"use client";

import { useState } from 'react';
import type { ServiceTask, WorkGroup } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-is-mobile';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';

import EditTaskForm from './edit-task-form';
import { resetBodyPointerEvents } from '@/lib/utils';

interface TaskEditDialogProps {
  task: ServiceTask;
  workgroups: WorkGroup[];
  onOpenChange: (open: boolean) => void;
  onTaskUpdate: () => void;
}

export default function TaskEditDialog({ task, workgroups, onOpenChange, onTaskUpdate }: TaskEditDialogProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(true);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      onOpenChange(false);
      // Delay to prevent premature pointer event reset
      setTimeout(resetBodyPointerEvents, 100);
    }
  };

  const handleDone = () => {
    handleOpenChange(false);
  };

  const form = (
    <EditTaskForm
      key={task.id}
      initialData={task}
      onDone={handleDone}
      onTaskUpdate={onTaskUpdate}
      workgroups={workgroups}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent 
            side="bottom" 
            className="rounded-t-lg"
            onInteractOutside={(e) => e.preventDefault()}
            onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="text-left">
            <SheetTitle>Editar Tarefa</SheetTitle>
            <SheetDescription>
              Atualize os detalhes da tarefa abaixo.
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">{form}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
          <DialogDescription>
            Atualize os detalhes da tarefa abaixo.
          </DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
