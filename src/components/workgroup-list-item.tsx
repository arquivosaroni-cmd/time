'use client';

import { useState } from 'react';
import type { WorkGroup } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import EditWorkgroupForm from './edit-workgroup-form';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, deleteDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { Edit, Trash2 } from 'lucide-react';

type WorkgroupListItemProps = {
  workgroup: WorkGroup;
};

export default function WorkgroupListItem({ workgroup }: WorkgroupListItemProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const isOwner = workgroup.ownerId === user?.uid;

  const handleEditWorkgroup = async (groupData: Partial<Omit<WorkGroup, "id" | "ownerId" | "createdAt">>) => {
    if (!firestore) return;
    const workgroupRef = doc(firestore, 'workgroups', workgroup.id);
    try {
      await updateDoc(workgroupRef, groupData);
      setIsEditOpen(false);
    } catch (error) {
      console.error("Erro ao editar grupo:", error);
    }
  };

  const handleDeleteWorkgroup = async () => {
    if (!firestore || !isOwner) return;

    try {
      await deleteDoc(doc(firestore, 'workgroups', workgroup.id));
      
      const membershipsQuery = query(collection(firestore, 'workgroup_memberships'), where('workGroupId', '==', workgroup.id));
      const membershipsSnapshot = await getDocs(membershipsQuery);
      
      const batch = writeBatch(firestore);
      membershipsSnapshot.forEach(doc => {
          batch.delete(doc.ref);
      });
      await batch.commit();

    } catch (error) {
      console.error("Erro ao excluir grupo:", error);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
      <div>
        <h3 className="font-semibold">{workgroup.name}</h3>
        <p className="text-sm text-muted-foreground">{workgroup.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4" />
              <span className="sr-only">Editar</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Grupo de Trabalho</DialogTitle>
            </DialogHeader>
            <EditWorkgroupForm
              workgroup={workgroup}
              onSubmit={handleEditWorkgroup}
              onDone={() => setIsEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
        
        {isOwner && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Excluir</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação não pode ser desfeita. Isso excluirá permanentemente o grupo e todas as suas tarefas e membros.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteWorkgroup} className="bg-destructive hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
