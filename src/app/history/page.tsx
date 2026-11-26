'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/header';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { ServiceTask } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useSelectedWorkgroup } from '@/hooks/use-selected-workgroup';
import { ReactCalendar } from '@/components/ui/react-calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import StatusHistory from '@/components/status-history';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy } from 'lucide-react';

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { selectedWorkGroupId, handleWorkGroupChange } = useSelectedWorkgroup();
  const [date, setDate] = useState<Date | undefined>(new Date());

  const archivedTasksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'archived_tasks'), orderBy('archivedAt', 'desc'));
  }, [firestore]);

  const { data: archivedTasks, isLoading: tasksLoading } = useCollection<ServiceTask>(archivedTasksQuery);
  
  const tasksForSelectedDate = useMemo(() => {
    if (!archivedTasks || !date) return [];
    return archivedTasks.filter(task => {
        const taskDate = task.archivedAt instanceof Date ? task.archivedAt : task.archivedAt?.toDate();
        return taskDate && format(taskDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
  }, [archivedTasks, date]);

  const isLoading = isUserLoading || tasksLoading;

  if (!isUserLoading && !user) {
    router.push('/login');
    return null;
  }

  const toDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return null;
  }
  
  const handleDateChange = (newDate: any) => {
    // react-calendar returns an array for range selection, handle single date
    const selectedDate = Array.isArray(newDate) ? newDate[0] : newDate;
    setDate(selectedDate);
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header selectedWorkGroupId={selectedWorkGroupId} onWorkGroupChange={handleWorkGroupChange} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Card className="w-full max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-400" />
              Histórico de Tarefas Concluídas
            </CardTitle>
            <CardDescription>
              Veja as tarefas que foram concluídas e arquivadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8">
            <div className="flex justify-center items-start">
              <ReactCalendar
                onChange={handleDateChange}
                value={date}
                locale="pt-BR"
              />
            </div>
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                    Tarefas concluídas em {date ? format(date, 'dd/MM/yyyy', {locale: ptBR}) : '...'}
                </h3>
              {isLoading ? (
                <>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </>
              ) : tasksForSelectedDate.length > 0 ? (
                <ScrollArea className="h-96 pr-2">
                  <Accordion type="single" collapsible className="w-full space-y-3">
                    {tasksForSelectedDate.map(task => {
                        const archivedDate = toDate(task.archivedAt);
                        return (
                          <AccordionItem value={task.id} key={task.id} className="border rounded-lg bg-card-foreground/5 px-4">
                            <AccordionTrigger className="py-4 text-left">
                              <div>
                                <p className="font-semibold">{task.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Arquivado em: {archivedDate ? format(archivedDate, "dd/MM/yy HH:mm", {locale: ptBR}) : 'Data indisponível'}
                                </p>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              {task.description && <p className="text-sm text-muted-foreground pb-4">{task.description}</p>}
                               <div className="border rounded-md bg-muted/25 p-3">
                                <StatusHistory statusHistory={task.statusHistory} assignedUserId={task.assignedUserId} />
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )
                    })}
                  </Accordion>
                </ScrollArea>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>Nenhuma tarefa concluída nesta data.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
