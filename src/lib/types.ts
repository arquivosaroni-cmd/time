
import { Timestamp } from "firebase/firestore";

export type Status = "Pendente" | "Em Produção" | "Finalizado";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  photoUrl?: string;
  whatsapp?: string;
  fcmToken?: string;
};

export type StatusLog = {
  status: Status;
  timestamp: Timestamp | Date;
  userId: string;
};

export type ServiceTask = {
  id: string;
  workGroupId: string;
  title: string;
  description: string;
  status: Status;
  assignedUserId: string;
  createdAt: Timestamp | Date;
  statusHistory?: StatusLog[];
  correlationId?: string;
  archivedAt?: Timestamp | Date;
  isPriority?: boolean;
  priorityAt?: Timestamp | Date;
  deadlineAt?: Timestamp | Date;
  position?: any;
  deadlineNotificationSent?: boolean;
  showStatusColor?: boolean;
};

export type WorkGroup = {
  id:string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: any;
};

export type WorkGroupMembership = {
  id?: string;
  workGroupId: string;
  userProfileId: string;
  role: 'admin' | 'member';
};

export type UserWorkgroupMembership = {
  userId: string;
  workGroupId: string;
}
