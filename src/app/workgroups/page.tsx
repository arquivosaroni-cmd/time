
'use client';

import { useMemo } from 'react';
import Header from '@/components/header';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { WorkGroup, WorkGroupMembership } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import WorkgroupListItem from '@/components/workgroup-list-item';
import { useRouter } from 'next/navigation';
import { useSelectedWorkgroup } from '@/hooks/use-selected-workgroup';

export default function WorkgroupsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
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

  const isLoading = isUserLoading || (user && (groupsLoading || membershipsLoading));

  if (!isUserLoading && !user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header selectedWorkGroupId={selectedWorkGroupId} onWorkGroupChange={handleWorkGroupChange} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 flex justify-center">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle>Gerenciar Grupos de Trabalho</CardTitle>
            <CardDescription>
              Edite ou exclua seus grupos de trabalho existentes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : workgroups && workgroups.length > 0 ? (
                workgroups.map(wg => <WorkgroupListItem key={wg.id} workgroup={wg} />)
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>Você ainda não faz parte de nenhum grupo de trabalho.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
