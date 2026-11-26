
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { useMemoFirebase } from '@/firebase';
import { ClipboardCopy } from 'lucide-react';
import { useSelectedWorkgroup } from '@/hooks/use-selected-workgroup';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { selectedWorkGroupId, handleWorkGroupChange } = useSelectedWorkgroup();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'profile', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const [displayName, setDisplayName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.name || '');
      setWhatsapp(userProfile.whatsapp || '');
    } else if (user) {
        setDisplayName(user.displayName || '');
    }
  }, [user, userProfile]);

  const isLoading = isUserLoading || (user && isProfileLoading);

  const handleCopyToClipboard = async () => {
    if (user?.uid) {
      try {
        await navigator.clipboard.writeText(user.uid);
        toast({
          title: "ID Copiado!",
          description: "Seu ID de usuário foi copiado para a área de transferência.",
        });
      } catch (error) {
        console.error("Erro ao copiar ID do usuário:", error);
        toast({
          variant: "destructive",
          title: "Erro ao copiar",
          description: "Não foi possível copiar o ID para a área de transferência.",
        });
      }
    }
  };

  if (isLoading) {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header selectedWorkGroupId={selectedWorkGroupId} onWorkGroupChange={handleWorkGroupChange} />
            <main className="flex-1 p-8 flex justify-center">
                <Skeleton className="w-full max-w-2xl h-72" />
            </main>
        </div>
    )
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleSave = async () => {
    if (!user || !firestore) return;

    setIsSaving(true);
    try {
      const batch = writeBatch(firestore);

      if(user.displayName !== displayName){
        await updateProfile(user, { displayName });
      }

      const dataToUpdate: Partial<UserProfile> = {
          name: displayName,
          whatsapp: whatsapp,
      };

      // 1. Update the document in the /users/{userId}/profile/{userId} subcollection
      batch.set(userProfileRef!, dataToUpdate, { merge: true });
      
      // 2. Update the denormalized document in the root /users/{userId}
      const userRootRef = doc(firestore, 'users', user.uid);
      batch.set(userRootRef, { name: displayName, whatsapp: whatsapp }, { merge: true });

      await batch.commit();

      toast({
        title: 'Perfil Atualizado!',
        description: 'Suas informações foram atualizadas com sucesso.',
      });

    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        variant: 'destructive',
        title: 'Erro!',
        description: 'Não foi possível atualizar seu perfil.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header selectedWorkGroupId={selectedWorkGroupId} onWorkGroupChange={handleWorkGroupChange} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Seu Perfil</CardTitle>
            <CardDescription>
              Veja e atualize suas informações de perfil.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="displayName">Nome Completo</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                placeholder="(XX) XXXXX-XXXX"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={user.email || ''} disabled />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="userId">Seu ID de Usuário</Label>
              <div className="flex items-center gap-2">
                <Input id="userId" value={user.uid} disabled />
                <Button variant="outline" size="icon" onClick={handleCopyToClipboard}>
                    <ClipboardCopy className="h-4 w-4" />
                    <span className="sr-only">Copiar ID do Usuário</span>
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
