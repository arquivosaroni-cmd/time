
export type Status = "Pendente" | "Em Produção" | "Finalizado";

export type StatusLog = {
  status: Status;
  timestamp: any;
  userId: string;
};

export type ServiceTask = {
  id: string;
  workGroupId: string;
  title: string;
  description: string;
  status: Status;
  assignedUserId: string;
  createdAt: any;
  statusHistory?: StatusLog[];
  correlationId?: string;
  archivedAt?: any;
  isPriority?: boolean;
};
