"use client";

import { useMemo, useState, useEffect } from "react";
import TaskColumn from "./task-column";
import { statuses } from "@/lib/data";
import type { ServiceTask, Status, WorkGroup, WorkGroupMembership } from "@/lib/types";
import TaskEditDialog from "./task-edit-dialog";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, doc, updateDoc, arrayUnion, where } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { cn, ensureDate } from "@/lib/utils";
import TaskCreateDialog from "./task-create-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  MeasuringStrategy,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import TaskCard from "./task-card";
import { Loader2, Search, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type TaskBoardProps = {
  workGroupId: string;
};

const tabTriggerColors: Record<Status, string> = {
  Pendente: "data-[state=active]:bg-orange-500 data-[state=active]:text-white",
  'Em Produção': "data-[state=active]:bg-yellow-500 data-[state=active]:text-white",
  Finalizado: "data-[state=active]:bg-green-500 data-[state=active]:text-white",
};

const statusDisplayNames: Record<Status, string> = {
  Pendente: "Pendente",
  "Em Produção": "Produção",
  Finalizado: "Finalizado",
};

export default function TaskBoard({ workGroupId }: TaskBoardProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [taskToEdit, setTaskToEdit] = useState<ServiceTask | null>(null);
  const [activeTab, setActiveTab] = useState<Status>(statuses[0]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const mql = window.matchMedia("(min-width: 1024px)");
    setIsLargeScreen(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsLargeScreen(e.matches);
    mql.addEventListener("change", onChange);

    const timer = setTimeout(() => setRefreshKey(prev => prev + 1), 200);
    return () => {
      mql.removeEventListener("change", onChange);
      clearTimeout(timer);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const tasksQuery = useMemoFirebase(() => {
    if (!workGroupId || !firestore) return null;
    return query(collection(firestore, `workgroups/${workGroupId}/tasks`));
  }, [firestore, workGroupId]);

  const { data: tasks, isLoading, error } = useCollection<ServiceTask>(tasksQuery);
  
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(task => {
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      
      // Busca por data do prazo (deadlineAt)
      let matchDate = false;
      if (task.deadlineAt) {
        const deadline = ensureDate(task.deadlineAt);
        const formattedDate = format(deadline, "dd/MM/yyyy", { locale: ptBR });
        matchDate = formattedDate.includes(q);
      }

      return matchTitle || matchDesc || matchDate;
    });
  }, [tasks, searchQuery]);

  const userMembershipsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    const membershipsCollection = collection(firestore, 'workgroup_memberships');
    return query(membershipsCollection, where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: memberships } = useCollection<WorkGroupMembership>(userMembershipsQuery);

  const workgroupIDs = useMemo(() => {
    return memberships?.map(m => m.workGroupId) || [];
  }, [memberships]);
  
  const userWorkgroupsQuery = useMemoFirebase(() => {
    if (!firestore || !user || workgroupIDs.length === 0) return null;
    return query(collection(firestore, 'workgroups'), where('id', 'in', workgroupIDs));
  }, [firestore, user, workgroupIDs]);

  const { data: userWorkgroups } = useCollection<WorkGroup>(userWorkgroupsQuery);
  
  const selectedWorkgroupRef = useMemoFirebase(() => {
    if (!firestore || !workGroupId) return null;
    return doc(firestore, 'workgroups', workGroupId);
  }, [firestore, workGroupId]);

  const { data: selectedWorkgroup } = useDoc<WorkGroup>(selectedWorkgroupRef);
  const isOwner = selectedWorkgroup?.ownerId === user?.uid;

  const handleStatusChange = async (taskId: string, newStatus: Status) => {
    if (!workGroupId || !firestore || !user) return;
    
    const currentTask = tasks?.find(t => t.id === taskId);
    if (!currentTask) return;

    const taskRef = doc(firestore, `workgroups/${workGroupId}/tasks`, taskId);
    const isPriorityUpdate = newStatus === 'Finalizado' ? false : (currentTask.isPriority ?? false);

    try {
      await updateDoc(taskRef, {
        status: newStatus,
        assignedUserId: user.uid,
        isPriority: isPriorityUpdate,
        statusHistory: arrayUnion({
          status: newStatus,
          timestamp: new Date(),
          userId: user.uid
        })
      });
      setActiveTab(newStatus);
    } catch (error) {
      console.error("Erro ao atualizar status da tarefa:", error);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !firestore || !user || !workGroupId || !tasks) return;

    const activeIdVal = active.id as string;
    const overIdVal = over.id as string;
    
    const activeTask = tasks.find(t => t.id === activeIdVal);
    if (!activeTask) return;

    const isTargetingDifferentColumn = statuses.includes(overIdVal as Status) && activeTask.status !== overIdVal;
    const overTask = tasks.find(t => t.id === overIdVal);
    const isDroppingOverDifferentColumnTask = overTask && activeTask.status !== overTask.status;

    if (!isLargeScreen && (isTargetingDifferentColumn || isDroppingOverDifferentColumnTask)) {
      return;
    }

    if (isTargetingDifferentColumn) {
      handleStatusChange(activeIdVal, overIdVal as Status);
      return;
    }

    if (overTask && activeTask.id !== overTask.id) {
       if (activeTask.isPriority !== overTask.isPriority) return;

       if (activeTask.status !== overTask.status) {
         handleStatusChange(activeIdVal, overTask.status);
         return;
       }

       const columnTasks = tasks
        .filter(t => t.status === activeTask.status && t.isPriority === activeTask.isPriority)
        .sort((a, b) => {
          const getTimeInternal = (t: any) => {
            const d = ensureDate(t);
            return d.getTime();
          };
          
          if (a.isPriority) {
            return getTimeInternal(a.priorityAt || a.createdAt) - getTimeInternal(b.priorityAt || b.createdAt);
          }
          return getTimeInternal(a.position || a.createdAt) - getTimeInternal(b.position || b.createdAt);
        });

       const activeIndex = columnTasks.findIndex(t => t.id === activeIdVal);
       const overIndex = columnTasks.findIndex(t => t.id === overIdVal);

       if (activeIndex !== overIndex) {
          const targetRef = doc(firestore, `workgroups/${workGroupId}/tasks`, activeIdVal);
          const sortField = activeTask.isPriority ? 'priorityAt' : 'position';
          
          const getTimeVal = (t: any) => {
            const d = ensureDate(t);
            return d.getTime();
          };

          let newTimeValue: Date;
          if (overIndex === 0) {
            const firstTime = getTimeVal(overTask.isPriority ? (overTask.priorityAt || overTask.createdAt) : (overTask.position || overTask.createdAt));
            newTimeValue = new Date(firstTime - 1000);
          } else if (overIndex === columnTasks.length - 1) {
            const lastTime = getTimeVal(overTask.isPriority ? (overTask.priorityAt || overTask.createdAt) : (overTask.position || overTask.createdAt));
            newTimeValue = new Date(lastTime + 1000);
          } else {
            const pIdx = overIndex < activeIndex ? overIndex - 1 : overIndex;
            const nIdx = overIndex < activeIndex ? overIndex : overIndex + 1;
            
            const pT = columnTasks[pIdx];
            const nT = columnTasks[nIdx];

            const t1v = getTimeVal(pT.isPriority ? (pT.priorityAt || pT.createdAt) : (pT.position || pT.createdAt));
            const t2v = getTimeVal(nT.isPriority ? (nT.priorityAt || nT.createdAt) : (nT.position || nT.createdAt));

            newTimeValue = new Date((t1v + t2v) / 2);
          }

          try {
            await updateDoc(targetRef, { [sortField]: newTimeValue });
          } catch (error) {
            console.error("Erro ao reordenar tarefa:", error);
          }
       }
    }
  };

  const handleStartEdit = (task: ServiceTask) => {
    setTaskToEdit(task);
  }
  
  const handleEditDone = () => {
    setTaskToEdit(null);
  };

  const filterTasksByStatus = (status: Status) => {
    return filteredTasks.filter((task) => task.status === status);
  };

  const activeTaskSnapshot = useMemo(() => filteredTasks.find(t => t.id === activeId), [activeId, filteredTasks]);

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-row justify-between items-center gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 flex-1">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-11 bg-muted/10 border-white/30 rounded-full h-11 focus-visible:ring-1 focus-visible:ring-primary/50"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent rounded-full"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Limpar pesquisa</span>
              </Button>
            )}
          </div>
        </div>
        {user && userWorkgroups && (
          <TaskCreateDialog
            workgroups={userWorkgroups}
            initialWorkGroupId={workGroupId}
            user={user}
          />
        )}
      </div>

      <div className="flex-1 min-h-0 px-4 sm:px-6 lg:px-8 pb-4 overflow-y-auto lg:overflow-hidden overflow-x-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full"/>
            <Skeleton className="h-24 w-full"/>
          </div>
        ) : error ? (
          <div className="text-destructive p-4 border rounded-md">Erro ao carregar tarefas.</div>
        ) : (
          <DndContext
            key={`dnd-context-${refreshKey}`}
            sensors={sensors}
            collisionDetection={closestCorners}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <div className={cn("lg:hidden h-full flex flex-col", isLargeScreen && "hidden")}>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Status)} className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-3 mb-4 sticky top-0 bg-background z-10 p-1 rounded-full">
                  {statuses.map((s) => {
                    const count = filterTasksByStatus(s).length;
                    return (
                      <TabsTrigger 
                        key={s} 
                        value={s} 
                        className={cn("flex items-center justify-center gap-2 rounded-full transition-all", tabTriggerColors[s])}
                      >
                        <span className="text-xs font-bold">{statusDisplayNames[s]}</span>
                        <span className="flex items-center justify-center bg-black/40 text-white text-[11px] font-black w-6 h-6 rounded-full">
                          {count}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {statuses.map((s) => (
                  <TabsContent key={s} value={s} className="flex-1 overflow-y-auto -mx-4 px-4">
                    {activeTab === s && (
                      <TaskColumn
                        id={s}
                        title={s}
                        tasks={filterTasksByStatus(s)}
                        onStatusChange={handleStatusChange}
                        onStartEdit={handleStartEdit}
                        isMobile
                        userWorkgroupIDs={workgroupIDs}
                        isOwner={isOwner}
                      />
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
            
            <div className={cn("hidden lg:grid lg:grid-cols-3 lg:grid-rows-[minmax(0,1fr)] gap-6 w-full h-full min-h-0 pb-4", !isLargeScreen && "lg:grid")}>
              {statuses.map((s) => (
                <TaskColumn
                  key={s}
                  id={s}
                  title={s}
                  tasks={filterTasksByStatus(s)}
                  onStatusChange={handleStatusChange}
                  onStartEdit={handleStartEdit}
                  userWorkgroupIDs={workgroupIDs}
                  isOwner={isOwner}
                />
              ))}
            </div>

            <DragOverlay
              dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                  styles: { active: { opacity: '0.5' } },
                }),
              }}
            >
              {activeId && activeTaskSnapshot ? (
                <div className="w-[calc(100vw-32px)] lg:w-[350px] pointer-events-none">
                  <TaskCard
                    task={activeTaskSnapshot}
                    onStatusChange={() => {}}
                    onStartEdit={() => {}}
                    userWorkgroupIDs={workgroupIDs}
                    isOwner={isOwner}
                    isDraggingOverlay
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
      
       {taskToEdit && userWorkgroups && (
        <TaskEditDialog
          task={taskToEdit}
          workgroups={userWorkgroups}
          onOpenChange={(open) => !open && handleEditDone()}
          onTaskUpdate={handleEditDone}
        />
      )}
    </div>
  );
}
