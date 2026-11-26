"use client";

import { useMemo, useEffect, useState } from "react";
import {
  Card,
  CardTitle,
} from "@/components/ui/card";
import { ServiceTask, Status, UserProfile } from "@/lib/types";
import { cn, ensureDate } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { Switch } from "@/components/ui/switch";
import { MoreHorizontal, Trash2, Edit, ArrowRight, Clock, Archive, GripVertical } from "lucide-react";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, collection, query, where, getDocs, writeBatch, serverTimestamp, updateDoc } from "firebase/firestore";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import StatusHistory from "./status-history";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Skeleton } from "./ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusBorderColors: Record<Status, string> = {
  Pendente: "border-l-4 border-l-orange-400",
  "Em Produção": "border-l-4 border-l-yellow-400",
  Finalizado: "border-l-4 border-l-green-400",
};

const priorityBorderColors: Record<Status, string> = {
  Pendente: "border-2 border-orange-400/50 border-l-orange-400",
  "Em Produção": "border-2 border-yellow-400/50 border-l-yellow-400",
  Finalizado: "border-2 border-green-400/50 border-l-green-400",
};

type TaskCardProps = {
  task: ServiceTask;
  onStatusChange: (taskId: string, newStatus: Status) => void;
  onStartEdit: (task: ServiceTask) => void;
  userWorkgroupIDs: string[];
  isOwner: boolean;
  isDraggingOverlay?: boolean;
};

const UserDisplay = ({ userId }: { userId: string }) => {
  const firestore = useFirestore();
  const userProfileRef = useMemoFirebase(() => {
    if (!userId || !firestore) return null;
    return doc(firestore, 'users', userId);
  }, [firestore, userId]);
  
  const { data: userProfile, isLoading: userLoading } = useDoc<UserProfile>(userProfileRef);

  if (userLoading) return <Skeleton className="h-4 w-20" />;
  
  return (
    <div className="flex items-center gap-1.5">
      <Avatar className="w-4 h-4">
        <AvatarImage src={userProfile?.photoUrl} />
        <AvatarFallback className="text-[10px]">{userProfile?.name?.charAt(0)}</AvatarFallback>
      </Avatar>
      <span className="text-[11px] font-medium text-muted-foreground">
        {(userProfile?.name?.split(' ')[0] || '')}
      </span>
    </div>
  );
};

export default function TaskCard({ task, onStatusChange, onStartEdit, userWorkgroupIDs, isOwner, isDraggingOverlay }: TaskCardProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [now, setNow] = useState(new Date());
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    over,
    active
  } = useSortable({ 
    id: task.id,
    disabled: isDraggingOverlay,
    data: {
      isPriority: task.isPriority,
      status: task.status
    }
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const deadlineProgress = useMemo(() => {
    const start = ensureDate(task.createdAt);
    const end = ensureDate(task.deadlineAt);
    if (!start || !end) return null;

    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    if (total <= 0) {
      return {
        progress: 100,
        isExpired: true,
        date: end
      };
    }

    const progressValue = Math.min(Math.max((elapsed / total) * 100, 0), 100);
    
    return {
      progress: progressValue,
      isExpired: elapsed >= total,
      date: end
    };
  }, [task.createdAt, task.deadlineAt, now]);

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const activeData = active?.data?.current as any;
  const isOver = over?.id === task.id && active?.id !== task.id;
  const showIndicator = isOver && activeData?.isPriority === task.isPriority;

  const handleDelete = async () => {
    if (!firestore) return;
    try {
      const batch = writeBatch(firestore);
      const correlationId = task.correlationId || task.id;
      
      for (const wgId of userWorkgroupIDs) {
        const q = query(collection(firestore, `workgroups/${wgId}/tasks`), where("correlationId", "==", correlationId));
        const snap = await getDocs(q);
        snap.forEach(d => batch.delete(d.ref));
        if (!task.correlationId && wgId === task.workGroupId) {
          batch.delete(doc(firestore, `workgroups/${wgId}/tasks`, task.id));
        }
      }
      await batch.commit();
      toast({ title: "Tarefa excluída universalmente" });
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error);
      toast({ variant: "destructive", title: "Erro ao excluir" });
    }
  };

  const handleArchiveTask = async () => {
    if (!firestore) return;
    try {
      const batch = writeBatch(firestore);
      const correlationId = task.correlationId || task.id;
      const archiveId = `${task.workGroupId}_${task.id}`;
      const archivedTaskRef = doc(firestore, "archived_tasks", archiveId);
      
      batch.set(archivedTaskRef, {
        ...task,
        id: archiveId,
        archivedAt: serverTimestamp(),
        isPriority: false, 
      });

      for (const wgId of userWorkgroupIDs) {
        const q = query(collection(firestore, `workgroups/${wgId}/tasks`), where("correlationId", "==", correlationId));
        const snap = await getDocs(q);
        snap.forEach(d => batch.delete(d.ref));
        if (!task.correlationId && wgId === task.workGroupId) {
          batch.delete(doc(firestore, `workgroups/${wgId}/tasks`, task.id));
        }
      }
      await batch.commit();
      toast({ title: "Tarefa arquivada universalmente" });
    } catch (error) {
      console.error("Erro ao arquivar:", error);
      toast({ variant: "destructive", title: "Erro ao arquivar" });
    }
  };

  const handleToggleStatusColor = async (checked: boolean) => {
    if (!firestore) return;
    const taskRef = doc(firestore, `workgroups/${task.workGroupId}/tasks`, task.id);
    try {
      await updateDoc(taskRef, { showStatusColor: checked });
    } catch (error) {
      console.error("Erro ao alternar cor de status:", error);
      toast({ variant: "destructive", title: "Erro ao atualizar tarefa" });
    }
  };

  const nextStatus = task.status === 'Pendente' ? 'Em Produção' : task.status === 'Em Produção' ? 'Finalizado' : null;
  const buttonText = task.status === 'Pendente' ? 'Iniciar' : 'Finalizar';

  const borderClass = task.showStatusColor 
    ? (task.isPriority ? priorityBorderColors[task.status] : statusBorderColors[task.status])
    : "border-l-4 border-l-muted-foreground/30";

  const getProgressStrokeColor = (progress: number) => {
    if (progress < 30) return "#3b82f6";
    if (progress < 60) return "#22c55e";
    return "#ef4444";
  };

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (270 / 360) * circumference;
  const gapLength = circumference - arcLength;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn("select-none transition-all duration-200", showIndicator && "pt-2 border-t-4 border-t-primary rounded-t-sm")}
    >
      <Card className={cn(
          "mb-3 transition-all duration-200 flex flex-col overflow-hidden relative group select-none data-[state=open]:bg-accent/10 data-[state=open]:shadow-lg",
          borderClass,
          isDraggingOverlay && "shadow-2xl opacity-90 scale-105"
      )}>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value={task.id} className="border-b-0">
            <div className="flex items-center w-full relative">
              <div 
                {...attributes} 
                {...listeners} 
                className="cursor-grab active:cursor-grabbing p-3 text-muted-foreground/60 hover:text-foreground transition-colors shrink-0 z-10 touch-none"
                style={{ touchAction: 'none' }}
              >
                <GripVertical className="h-4 w-4" />
              </div>
              
              <AccordionTrigger className="flex-1 py-4 px-3 hover:no-underline flex items-center justify-between text-left group w-full">
                <div className="flex flex-col gap-1.5 w-full pr-8">
                  <CardTitle className="text-sm font-semibold leading-tight break-words">
                    {task.title}
                  </CardTitle>
                  {deadlineProgress && task.status !== 'Finalizado' && (
                    <div className="w-full space-y-1 mt-1">
                      <Progress 
                        value={deadlineProgress.progress} 
                        className="h-1 bg-gradient-to-r from-blue-500/20 via-green-500/20 to-red-500/20 overflow-hidden"
                        indicatorClassName={cn(
                          "transition-all duration-500 h-full",
                          deadlineProgress.progress < 30 ? "bg-blue-500 opacity-40" :
                          deadlineProgress.progress < 60 ? "bg-green-500 opacity-40" :
                          deadlineProgress.progress < 90 ? "bg-red-500 opacity-40" :
                          "bg-red-500 opacity-100" 
                        )}
                      />
                      <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tighter opacity-60">
                        <span>PRAZO: {format(deadlineProgress.date, "dd/MM/yyyy", { locale: ptBR })}</span>
                        <span className={cn(deadlineProgress.isExpired && "text-red-500")}>
                          {deadlineProgress.isExpired ? "Expirado" : `${Math.round(100 - deadlineProgress.progress)}% restante`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionTrigger>
            </div>

            <AccordionContent className="px-3 pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="text-xs text-muted-foreground mb-3 font-normal break-words flex-1">
                    {task.description || "Sem descrição."}
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0 -mt-1">
                    <Switch 
                      checked={task.showStatusColor || false} 
                      onCheckedChange={handleToggleStatusColor}
                      className="scale-75 data-[state=checked]:bg-green-500"
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                          < MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onStartEdit(task)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        {task.status !== 'Pendente' && (
                          <DropdownMenuItem onClick={() => onStatusChange(task.id, 'Pendente')}>
                            <Clock className="mr-2 h-4 w-4" />
                            <span>Mover para Pendente</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive" onSelect={e => e.preventDefault()}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir Universal</span>
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir de TODOS os grupos?</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 rounded-full">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              
              <div className="border rounded-md bg-muted/20 mb-3">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="details" className="border-b-0">
                    <AccordionTrigger className="p-2 justify-between text-[10px] text-muted-foreground hover:no-underline h-8">
                      Histórico & Tempos
                    </AccordionTrigger>
                    <AccordionContent className="p-2 pt-0">
                      <StatusHistory statusHistory={task.statusHistory} assignedUserId={task.assignedUserId} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {deadlineProgress && task.status !== 'Finalizado' && (
                <div className="mb-4 p-4 border rounded-lg bg-card/40 flex items-center gap-5">
                  <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform rotate-[135deg]">
                      <defs>
                        <linearGradient id={`sphere-grad-${task.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                          <stop offset="50%" stopColor="#22c55e" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        stroke={`url(#sphere-grad-${task.id})`}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={`${arcLength} ${gapLength}`}
                        strokeLinecap="round"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        stroke={getProgressStrokeColor(deadlineProgress.progress)}
                        strokeWidth="6"
                        strokeDasharray={`${(arcLength * deadlineProgress.progress) / 100} 1000`}
                        strokeLinecap="round"
                        fill="transparent"
                        className={cn(
                          "transition-all duration-500",
                          deadlineProgress.progress < 90 ? "opacity-40" : "opacity-100 animate-pulse"
                        )}
                      />
                    </svg>
                    <span className="absolute text-xs font-black text-white">
                      {Math.round(deadlineProgress.progress)}%
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-50">Prazo Limite</span>
                    <span className="text-xl font-black text-foreground">
                      {format(deadlineProgress.date, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Até as 18:00</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <UserDisplay userId={task.assignedUserId} />
                </div>
                
                {nextStatus && (
                  <Button variant="outline" size="sm" onClick={() => onStatusChange(task.id, nextStatus)} className="h-8 text-xs font-semibold rounded-full">
                    {buttonText}
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                  </Button>
                )}

                {task.status === 'Finalizado' && isOwner && (
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="default" size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 rounded-full">
                              <Archive className="mr-1.5 h-3.5 w-3.5" />
                              Arquivar Universal
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Arquivar e remover de todos os grupos?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleArchiveTask} className="bg-primary rounded-full">Confirmar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
}
