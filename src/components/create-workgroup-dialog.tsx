
"use client";

import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { Button } from './ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import CreateWorkgroupForm from './create-workgroup-form';
import type { WorkGroup } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { resetBodyPointerEvents } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CreateWorkgroupDialogProps {
    onWorkgroupCreated: (newGroupId: string) => void;
}

export default function CreateWorkgroupDialog({ onWorkgroupCreated }: CreateWorkgroupDialogProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleCreateWorkgroup = async (groupData: Omit<WorkGroup, "id" | "ownerId" | "createdAt">) => {
    if (!firestore || !user) {
        toast({ variant: "destructive", title: "Erro de Autenticação", description: "Você precisa estar logado para criar um grupo." });
        return;
    };
  
    const batch = writeBatch(firestore);
    
    const newWorkgroupRef = doc(collection(firestore, "workgroups"));
    batch.set(newWorkgroupRef, {
      ...groupData,
      id: newWorkgroupRef.id,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
    });
  
    const membershipRef = doc(firestore, `workgroups/${newWorkgroupRef.id}/memberships`, user.uid);
    batch.set(membershipRef, {
      workGroupId: newWorkgroupRef.id,
      userProfileId: user.uid,
      role: "admin",
    });
    
    const userMembershipRef = doc(firestore, 'workgroup_memberships', `${newWorkgroupRef.id}_${user.uid}`);
    batch.set(userMembershipRef, {
        userId: user.uid,
        workGroupId: newWorkgroupRef.id,
    });
  
    try {
      await batch.commit();
      onWorkgroupCreated(newWorkgroupRef.id);
      toast({ title: "Grupo Criado!", description: `O grupo "${groupData.name}" foi criado com sucesso.` });
      setIsOpen(false);
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
      toast({ variant: "destructive", title: "Erro ao Criar Grupo", description: "Não foi possível criar o grupo. Tente novamente." });
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(resetBodyPointerEvents, 100);
    }
  };

  const form = (
    <CreateWorkgroupForm
      onSubmit={handleCreateWorkgroup}
      onDone={() => handleOpenChange(false)}
    />
  );

  const triggerButton = (
    <Button variant="outline" size="icon" className="shrink-0 rounded-full">
      <PlusCircle className="h-4 w-4" />
      <span className="sr-only">Criar Grupo</span>
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
        <SheetContent 
            side="bottom" 
            className="rounded-t-lg"
            onInteractOutside={(e) => e.preventDefault()}
            onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="text-left">
            <SheetTitle>Criar Novo Grupo de Trabalho</SheetTitle>
            <SheetDescription>Dê um nome e uma descrição para o seu novo grupo.</SheetDescription>
          </SheetHeader>
          <div className="py-4">{form}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent 
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Criar Novo Grupo de Trabalho</DialogTitle>
          <DialogDescription>Dê um nome e uma descrição para o seu novo grupo.</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
}
