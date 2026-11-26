
"use client";

import { useEffect, useMemo } from "react";
import Header from "@/components/header";
import TaskBoard from "@/components/task-board";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { WorkGroup, WorkGroupMembership } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedWorkgroup } from "@/hooks/use-selected-workgroup";
import CollaborativeIllustration from "@/components/collaborative-illustration";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { selectedWorkGroupId, handleWorkGroupChange } = useSelectedWorkgroup();


  const membershipsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    const membershipsCollection = collection(firestore, 'workgroup_memberships');
    return query(membershipsCollection, where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: memberships, isLoading: membershipsLoading } = useCollection<WorkGroupMembership>(membershipsQuery);

  const workgroupIDs = useMemo(() => {
    return memberships?.map(m => m.workGroupId) || [];
  }, [memberships]);
  
  const workgroupsQuery = useMemoFirebase(() => {
    if (!firestore || workgroupIDs.length === 0) return null;
    return query(collection(firestore, 'workgroups'), where('id', 'in', workgroupIDs));
  }, [firestore, workgroupIDs]);

  const { data: workgroups, isLoading: groupsLoading } = useCollection<WorkGroup>(workgroupsQuery);

  useEffect(() => {
    if (workgroups) {
      // If there's a selected group ID, check if it's still valid
      const selectedGroupExists = workgroups.some(wg => wg.id === selectedWorkGroupId);
      
      if (selectedWorkGroupId && selectedGroupExists) {
        // The selected group is valid, do nothing
        return;
      }
      
      if (workgroups.length > 0) {
        // If no valid group is selected, default to the first one in the list
        handleWorkGroupChange(workgroups[0].id);
      } else {
        // No workgroups available
        handleWorkGroupChange(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workgroups, selectedWorkGroupId]);

  const isLoading = isUserLoading || (user && (groupsLoading || membershipsLoading));

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header selectedWorkGroupId={null} onWorkGroupChange={() => {}}/>
        <main className="flex-1 flex items-center justify-center">
           <div className="flex flex-col items-center gap-4">
             <Loader2 className="h-12 w-12 animate-spin text-primary" />
             <p className="text-muted-foreground">Carregando seus dados...</p>
           </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <Header selectedWorkGroupId={selectedWorkGroupId} onWorkGroupChange={handleWorkGroupChange} />
      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto h-full">
          {selectedWorkGroupId ? (
            <TaskBoard workGroupId={selectedWorkGroupId} />
          ) : (
            <div className="p-8 text-center flex flex-col items-center justify-center h-full">
              <CollaborativeIllustration className="w-full max-w-sm h-auto mb-8" />
              <p className="text-muted-foreground text-lg">
                { user ? "Nenhum grupo de trabalho encontrado. Crie um novo grupo para começar." : "Faça login para ver suas tarefas."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
