
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Logo from "@/components/logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  useDoc, 
  useFirestore, 
  requestNotificationPermission, 
  disableNotifications,
  setupForegroundMessageListener, 
  setupPWAInstallListener, 
  useAuth, 
  useMessaging 
} from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import type { WorkGroup, UserProfile } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAuth } from "firebase/auth";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ManageMembersDialog from "@/components/manage-members-dialog";
import { Users, User as UserIcon, Settings, FolderKanban, History, Bell, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import CreateWorkgroupDialog from "@/components/create-workgroup-dialog";
import { useToast } from "@/hooks/use-toast";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type HeaderProps = {
  selectedWorkGroupId: string | null;
  onWorkGroupChange: (id: string | null) => void;
};

export default function Header({ selectedWorkGroupId, onWorkGroupChange }: HeaderProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const messaging = useMessaging();
  const router = useRouter();
  const { toast } = useToast();
  const { canInstall, triggerInstall } = usePWAInstall();

  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsPushSupported(true);
    }
    
    if (user && messaging && firestore && auth) {
      const unsubscribeMsg = setupForegroundMessageListener(messaging);
      setupPWAInstallListener(messaging, auth, firestore);
      return () => unsubscribeMsg?.();
    }
  }, [user, messaging, firestore, auth]);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'profile', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const membershipsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'workgroup_memberships'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: userMemberships } = useCollection(membershipsQuery);

  const workgroupIDs = useMemo(() => {
    return userMemberships?.map(m => m.workGroupId) || [];
  }, [userMemberships]);
  
  const workgroupsQuery = useMemoFirebase(() => {
    if (!firestore || !user || workgroupIDs.length === 0) return null;
    return query(collection(firestore, 'workgroups'), where('id', 'in', workgroupIDs));
  }, [firestore, user, workgroupIDs]);

  const { data: workgroups, isLoading: groupsLoading } = useCollection<WorkGroup>(workgroupsQuery);
  
  const handleToggleNotifications = async (checked: boolean) => {
    if (!messaging || !auth || !firestore) return;

    if (checked) {
      const granted = await requestNotificationPermission(messaging, auth, firestore);
      if (granted) {
        toast({ title: "Notificações Ativadas", description: "Você receberá atualizações das tarefas." });
      } else {
        toast({ variant: "destructive", title: "Permissão Negada", description: "Ative as notificações nas configurações do navegador." });
      }
    } else {
      await disableNotifications(messaging, auth, firestore);
      toast({ title: "Notificações Desativadas", description: "Você não receberá mais alertas neste dispositivo." });
    }
  };

  const handleLogout = async () => {
    try {
      await getAuth().signOut();
      router.push('/login');
    } catch (error) {
      console.error("Erro ao sair da conta:", error);
      toast({ variant: "destructive", title: "Erro ao sair", description: "Não foi possível encerrar a sessão." });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
      <div className="container flex flex-wrap items-center justify-between h-auto md:h-16 py-2 md:py-0 px-4">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-lg text-foreground">Time</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 order-2 md:order-3">
          {isUserLoading ? (
            <Skeleton className="h-10 w-24" />
          ) : user ? (
             <>
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || ''} />
                      <AvatarFallback>{user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {isPushSupported && (
                    <div className="flex items-center justify-between px-2 py-2">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="notifications-toggle" className="text-sm cursor-pointer">Notificações</Label>
                      </div>
                      <Switch
                        id="notifications-toggle"
                        checked={!!userProfile?.fcmToken}
                        onCheckedChange={handleToggleNotifications}
                      />
                    </div>
                  )}

                  {canInstall && (
                    <DropdownMenuItem onClick={triggerInstall}>
                      <Download className="mr-2 h-4 w-4" />
                      <span>Instalar App (PWA)</span>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Meu Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                   <DropdownMenuItem asChild>
                    <Link href="/history" className="cursor-pointer">
                      <History className="mr-2 h-4 w-4" />
                      <span>Histórico de Tarefas</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                    Sair da Conta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Cadastre-se</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 order-3 md:order-2">
          {user && !groupsLoading && workgroups ? (
            <Select
              value={selectedWorkGroupId || ""}
              onValueChange={(value) => onWorkGroupChange(value || null)}
            >
              <SelectTrigger className="w-full md:w-[280px] text-base font-semibold">
                <SelectValue placeholder="Selecione um grupo" />
              </SelectTrigger>
              <SelectContent>
                {workgroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : ( user &&
            <Skeleton className="h-10 w-full md:w-[280px]" />
          )}
           {user && (
            <>
              <CreateWorkgroupDialog onWorkgroupCreated={onWorkGroupChange}/>

              {workgroups && workgroups.length > 0 && (
                 <Button variant="outline" size="icon" className="shrink-0" asChild>
                    <Link href="/workgroups">
                      <FolderKanban className="h-4 w-4" />
                      <span className="sr-only">Gerenciar Grupos</span>
                    </Link>
                  </Button>
              )}
              
              {selectedWorkGroupId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0">
                      <Settings className="h-4 w-4" />
                      <span className="sr-only">Configurações do Grupo</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Opções do Grupo</DropdownMenuLabel>
                    <DropdownMenuSeparator/>
                     <Dialog open={isManageMembersOpen} onOpenChange={setIsManageMembersOpen}>
                        <DialogTrigger asChild>
                           <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Users className="mr-2 h-4 w-4" />
                              <span>Membros do Grupo</span>
                           </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[520px]">
                           <ManageMembersDialog workGroupId={selectedWorkGroupId} />
                        </DialogContent>
                     </Dialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
