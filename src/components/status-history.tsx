
"use client";

import { useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { UserProfile, Status, StatusLog } from "@/lib/types";
import { format, formatDistanceStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { doc } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { CheckCircle, Clock, Loader, User } from "lucide-react";

type StatusHistoryProps = {
  statusHistory?: StatusLog[];
  assignedUserId: string;
};

// Helper to convert Firestore Timestamp or JS Date to a JS Date object
const toDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp.toDate) { // Firestore Timestamp
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) { // JavaScript Date
    return timestamp;
  }
  // Handle cases where it might be a string or number from Firestore
  try {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) return d;
  } catch (e) {
    console.error("Erro ao converter timestamp:", e);
  }

  return null;
}

const statusIcons: Record<Status, React.ReactNode> = {
    Pendente: <Clock className="w-4 h-4 text-orange-400" />,
    "Em Produção": <Loader className="w-4 h-4 text-yellow-400 animate-spin" />,
    Finalizado: <CheckCircle className="w-4 h-4 text-green-400" />,
};

const formatUserName = (name: string | undefined): string => {
  if (!name) return "";
  const nameParts = name.trim().split(" ");
  if (nameParts.length <= 1) {
    return name;
  }
  return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
};
  
const UserDisplay = ({ userId }: { userId: string }) => {
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(() => {
        if (!userId || !firestore) return null;
        return doc(firestore, 'users', userId);
    }, [firestore, userId]);
    
    const { data: userProfile, isLoading: userLoading } = useDoc<UserProfile>(userProfileRef);

    if (userLoading) return <Skeleton className="h-5 w-24" />;
    if (!userProfile) return <span className="text-xs text-muted-foreground">Usuário desconhecido</span>;
    
    return (
        <div className="flex items-center gap-2">
        <Avatar className="w-5 h-5">
            <AvatarImage src={userProfile.photoUrl} alt={userProfile.name} />
            <AvatarFallback>{userProfile.name?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium text-foreground">{formatUserName(userProfile.name)}</span>
        </div>
    );
};

export default function StatusHistory({ statusHistory }: StatusHistoryProps) {
  if (!statusHistory || statusHistory.length === 0) {
    return <div className="text-xs text-muted-foreground">Sem histórico de status.</div>;
  }

  const sortedHistory = [...statusHistory].sort((a,b) => {
    const timeA = toDate(a.timestamp)?.getTime() || 0;
    const timeB = toDate(b.timestamp)?.getTime() || 0;
    return timeA - timeB;
  });

  const getStatusDuration = (startStatus: Status, endStatus: Status): string | null => {
    const startIndex = sortedHistory.findIndex(h => h.status === startStatus);
    if (startIndex === -1) return null;

    // Find the next status change after the start index
    const endIndex = sortedHistory.findIndex((h, i) => i > startIndex && h.status === endStatus);
    if (endIndex === -1) return null;
    
    const startTime = toDate(sortedHistory[startIndex].timestamp);
    const endTime = toDate(sortedHistory[endIndex].timestamp);

    if (startTime && endTime) {
        return formatDistanceStrict(endTime, startTime, { locale: ptBR, addSuffix: false });
    }
    return null;
  }
  
  const timeInPendente = getStatusDuration("Pendente", "Em Produção");
  const timeInProducao = getStatusDuration("Em Produção", "Finalizado");

  return (
    <div className="space-y-4">
      {(timeInPendente || timeInProducao) && (
        <div>
           <h4 className="font-semibold text-foreground mb-2">Tempos de Execução</h4>
           <div className="text-xs text-muted-foreground space-y-2">
             {timeInPendente && (
                <div className="flex justify-between items-center">
                    <span className="font-medium flex items-center gap-2"><Clock className="h-3 w-3 text-orange-400"/> Tempo em Pendente:</span>
                    <span className="font-semibold text-foreground">{timeInPendente}</span>
                </div>
            )}
             {timeInProducao && (
                <div className="flex justify-between items-center">
                    <span className="font-medium flex items-center gap-2"><Clock className="h-3 w-3 text-yellow-400"/> Tempo em Produção:</span>
                    <span className="font-semibold text-foreground">{timeInProducao}</span>
                </div>
            )}
           </div>
        </div>
      )}

      <div className="space-y-2 border-t pt-3">
          <h4 className="font-semibold text-foreground mb-2">Histórico de Status</h4>
          <div className="text-xs text-muted-foreground space-y-2">
            {sortedHistory.map((log, index) => {
                const logDate = toDate(log.timestamp);
                return (
                <div key={log.status + index} className="flex justify-between items-center">
                    <div className="flex items-center gap-2 w-[150px]">
                       <div className="w-4 h-4 flex items-center justify-center">{statusIcons[log.status as Status]}</div>
                       <UserDisplay userId={log.userId} />
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="w-[90px] text-right">{logDate ? format(logDate, "dd/MM/yy HH:mm", { locale: ptBR }) : '...'}</span>
                    </div>
                </div>
                )
            })}
          </div>
      </div>
      
    </div>
  );
}
