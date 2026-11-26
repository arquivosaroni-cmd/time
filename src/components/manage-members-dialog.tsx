"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, query, doc, writeBatch } from "firebase/firestore";
import type { UserProfile, WorkGroupMembership } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
import { X, Search } from "lucide-react";

type ManageMembersDialogProps = {
  workGroupId: string;
};

const formatUserName = (name: string | undefined): string => {
  if (!name) return "";
  const nameParts = name.trim().split(" ");
  if (nameParts.length <= 1) {
    return name;
  }
  return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
};

const MemberListItem = ({ userId, onRemove, workGroupId }: { userId: string, onRemove: (userId: string) => void, workGroupId: string }) => {
    const firestore = useFirestore();
    const { user: currentUser } = useUser();
    
    const workgroupRef = useMemoFirebase(() => {
        if (!workGroupId || !firestore) return null;
        return doc(firestore, 'workgroups', workGroupId);
    }, [firestore, workGroupId]);

    const { data: workgroup } = useDoc(workgroupRef);

    const userProfileRef = useMemoFirebase(() => {
        if (!userId || !firestore) return null;
        return doc(firestore, 'users', userId);
    }, [firestore, userId]);
    
    const { data: profile, isLoading } = useDoc<UserProfile>(userProfileRef);

    const isOwner = workgroup?.ownerId === profile?.id;
    const canBeRemoved = currentUser?.uid !== userId;

    if (isLoading) {
        return <Skeleton className="h-10 w-full" />;
    }

    if (!profile) {
        return (
             <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted group">
                <span className="text-sm text-muted-foreground">Usuário não encontrado: {userId}</span>
                 <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => onRemove(userId)}>
                    <X className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Remover membro</span>
                </Button>
             </div>
        );
    }
    
    return (
        <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted group">
            <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={profile.photoUrl} alt={profile.name} />
                    <AvatarFallback>{profile.name?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="text-sm font-medium">{formatUserName(profile.name)}{isOwner && <span className="text-xs text-muted-foreground"> (Dono)</span>}</span>
                    <span className="text-xs text-muted-foreground">{profile.email}</span>
                </div>
            </div>
            {canBeRemoved && !isOwner && (
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => onRemove(profile.id)}>
                    <X className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Remover membro</span>
                </Button>
            )}
        </div>
    )
}

const UserSelectionList = ({ onAddMember, existingMemberIds }: { onAddMember: (userId: string) => Promise<void>, existingMemberIds: string[] }) => {
  const firestore = useFirestore();
  const [filterTerm, setFilterTerm] = useState("");

  const allUsersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: allUsers, isLoading: usersLoading } = useCollection<UserProfile>(allUsersQuery);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    if (!filterTerm) return allUsers;

    const lowercasedFilter = filterTerm.toLowerCase();
    return allUsers.filter(user => 
      user.name?.toLowerCase().includes(lowercasedFilter) ||
      user.email?.toLowerCase().includes(lowercasedFilter)
    );
  }, [allUsers, filterTerm]);


  const handleAddClick = async (userId: string) => {
    await onAddMember(userId);
  };

  return (
    <div className="grid gap-4">
      <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <Input
              id="user-filter"
              placeholder="Filtrar por nome ou e-mail..."
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              className="pl-10"
          />
      </div>

      <ScrollArea className="h-48 rounded-md border">
        <div className="p-2">
          {usersLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoUrl} alt={user.name} />
                    <AvatarFallback>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{formatUserName(user.name)}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAddClick(user.id)}
                  disabled={existingMemberIds.includes(user.id)}
                >
                  {existingMemberIds.includes(user.id) ? 'Membro' : 'Adicionar'}
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-center text-muted-foreground py-4">Nenhum usuário encontrado.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};


export default function ManageMembersDialog({ workGroupId }: ManageMembersDialogProps) {
  const firestore = useFirestore();
  const [error, setError] = useState<string | null>(null);

  const membersQuery = useMemoFirebase(() => {
    if (!workGroupId || !firestore) return null;
    return query(collection(firestore, 'workgroups', workGroupId, 'memberships'));
  }, [firestore, workGroupId]);

  const { data: members, isLoading: membersLoading } = useCollection<WorkGroupMembership>(membersQuery);
  const existingMemberIds = useMemo(() => members?.map(m => m.userProfileId) || [], [members]);

  const handleAddMember = async (userIdToAdd: string) => {
    if (!userIdToAdd || !firestore) return;
    setError(null);

    try {
      if (members?.some(m => m.userProfileId === userIdToAdd)) {
        setError("Este usuário já é membro do grupo.");
        return;
      }
      
      const batch = writeBatch(firestore);

      const membershipRef = doc(firestore, `workgroups/${workGroupId}/memberships`, userIdToAdd);
      batch.set(membershipRef, {
        workGroupId: workGroupId,
        userProfileId: userIdToAdd,
        role: "member",
      });

      const userMembershipRef = doc(firestore, 'workgroup_memberships', `${workGroupId}_${userIdToAdd}`);
      batch.set(userMembershipRef, {
        userId: userIdToAdd,
        workGroupId: workGroupId,
      });

      await batch.commit();

    } catch (e) {
      console.error("Erro ao adicionar membro:", e);
      setError("Ocorreu um erro ao adicionar o membro.");
    }
  };
  
  const handleRemoveMember = async (userId: string) => {
    if (!firestore || !workGroupId) return;

    try {
        const batch = writeBatch(firestore);

        const membershipRef = doc(firestore, `workgroups/${workGroupId}/memberships`, userId);
        batch.delete(membershipRef);

        const userMembershipRef = doc(firestore, 'workgroup_memberships', `${workGroupId}_${userId}`);
        batch.delete(userMembershipRef);

        await batch.commit();
    } catch (error) {
        console.error("Error removing member:", error);
        setError("Failed to remove member.");
    }
};

  return (
    <>
      <DialogHeader>
        <DialogTitle>Gerenciar Membros</DialogTitle>
        <DialogDescription>
          Adicione ou remova membros deste grupo de trabalho.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <UserSelectionList onAddMember={handleAddMember} existingMemberIds={existingMemberIds} />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Membros Atuais</h3>
        <ScrollArea className="h-48 rounded-md border">
          <div className="p-4">
            {membersLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : members && members.length > 0 ? (
              members.map(member => (
                <MemberListItem key={member.userProfileId} userId={member.userProfileId} onRemove={handleRemoveMember} workGroupId={workGroupId}/>
              ))
            ) : (
              <p className="text-sm text-center text-muted-foreground py-4">Nenhum membro encontrado.</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
