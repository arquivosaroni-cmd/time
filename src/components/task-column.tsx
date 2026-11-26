
import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import TaskCard from "./task-card";
import { ServiceTask, Status } from "@/lib/types";
import { cn } from "@/lib/utils";
import { History } from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

type TaskColumnProps = {
  id: string;
  title: Status;
  tasks: ServiceTask[];
  onStatusChange: (taskId: string, status: Status) => void;
  onStartEdit: (task: ServiceTask) => void;
  isMobile?: boolean;
  userWorkgroupIDs: string[];
  isOwner: boolean;
};

const statusColors: Record<Status, string> = {
  Pendente: "text-orange-500",
  "Em Produção": "text-yellow-500",
  Finalizado: "text-green-500",
};

const badgeStatusColors: Record<Status, string> = {
  Pendente: "text-background border-orange-500 bg-orange-500",
  "Em Produção": "text-background border-yellow-500 bg-yellow-500",
  Finalizado: "text-background border-green-500 bg-green-500",
};

const statusDisplayNames: Record<Status, string> = {
  Pendente: "Pendente",
  "Em Produção": "Produção",
  Finalizado: "Finalizado",
};

export default function TaskColumn({ id, title, tasks, onStatusChange, onStartEdit, isMobile = false, userWorkgroupIDs, isOwner }: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const getTimeInt = (t: any) => {
        if (!t) return 0;
        if (t instanceof Date) return t.getTime();
        if (t.toDate) return t.toDate().getTime();
        return new Date(t).getTime();
      };

      if (a.isPriority && b.isPriority) {
        const timeA = getTimeInt(a.priorityAt || a.createdAt);
        const timeB = getTimeInt(b.priorityAt || b.createdAt);
        return timeA - timeB;
      }
      
      if (a.isPriority) return -1;
      if (b.isPriority) return 1;

      // Regular tasks use 'position' for sorting to preserve 'createdAt' for time bar
      const posA = getTimeInt(a.position || a.createdAt);
      const posB = getTimeInt(b.position || b.createdAt);
      return posA - posB;
    });
  }, [tasks]);

  const priorityTasks = sortedTasks.filter(t => t.isPriority);
  const regularTasks = sortedTasks.filter(t => !t.isPriority);
  const isFinalized = title === 'Finalizado';

  const content = (
    <div 
      ref={setNodeRef} 
      className={cn(
        "min-h-full transition-colors duration-200",
        isOver && "bg-primary/5 rounded-lg border-2 border-dashed border-primary/20"
      )}
    >
      <div className="space-y-2 p-1">
        {sortedTasks.length > 0 ? (
          <>
            {isFinalized ? (
              <SortableContext
                items={sortedTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onStatusChange={onStatusChange} 
                    onStartEdit={onStartEdit}
                    userWorkgroupIDs={userWorkgroupIDs} 
                    isOwner={isOwner}
                  />
                ))}
              </SortableContext>
            ) : (
              <>
                <SortableContext
                  items={priorityTasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 mb-4">
                    {priorityTasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        onStatusChange={onStatusChange} 
                        onStartEdit={onStartEdit}
                        userWorkgroupIDs={userWorkgroupIDs} 
                        isOwner={isOwner}
                      />
                    ))}
                  </div>
                </SortableContext>

                {regularTasks.length > 0 && (
                  <div className="space-y-2">
                    {priorityTasks.length > 0 && (
                      <div className="flex items-center gap-2 px-1 py-4">
                        <Separator className="flex-1 h-[1px] bg-white/10" />
                        <span className="text-[9px] font-black uppercase tracking-tighter whitespace-nowrap text-white/40">
                          Outras Tarefas
                        </span>
                        <Separator className="flex-1 h-[1px] bg-white/10" />
                      </div>
                    )}
                    <SortableContext
                      items={regularTasks.map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {regularTasks.map(task => (
                          <TaskCard 
                            key={task.id} 
                            task={task} 
                            onStatusChange={onStatusChange} 
                            onStartEdit={onStartEdit}
                            userWorkgroupIDs={userWorkgroupIDs} 
                            isOwner={isOwner}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground py-10 opacity-50">
            Vazio
          </div>
        )}
      </div>
      
      {isFinalized && (
        <div className="mt-4 px-1">
           <Button variant="outline" size="sm" className="w-full text-[11px] h-8 opacity-70 hover:opacity-100" asChild>
              <Link href="/history">
                  <History className="mr-1.5 h-3.5 w-3.5" />
                  Histórico
              </Link>
          </Button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0 w-full min-w-0">
      <div className="flex items-center justify-between p-3 rounded-t-lg bg-card/40 border-b shrink-0">
        <h2 className={cn("font-bold text-xs uppercase tracking-widest", statusColors[title])}>
          {statusDisplayNames[title]}
        </h2>
        <Badge variant="outline" className={cn("text-[10px] h-5 min-w-[20px] justify-center font-bold text-background", badgeStatusColors[title])}>
          {sortedTasks.length}
        </Badge>
      </div>
      <ScrollArea className="p-2 bg-card/20 rounded-b-lg flex-1 min-h-0">
        {content}
      </ScrollArea>
    </div>
  );
}
