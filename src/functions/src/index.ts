
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { info, log, warn, error as logError } from "firebase-functions/logger";

// Define a payload precisa para evitar erro de indexação no messaging
type CustomMessagingPayload = admin.messaging.MessagingPayload & {
  webpush?: admin.messaging.WebpushConfig;
};

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Envia notificação quando uma tarefa é alterada ou criada.
 */
export const onTaskChange = functions
  .region("southamerica-east1")
  .firestore.document("/workgroups/{workgroupId}/tasks/{taskId}")
  .onWrite(async (change, context) => {
    const {workgroupId, taskId} = context.params;
    
    if (!change.after.exists) return null;

    const taskData = change.after.data();
    if (!taskData) return null;

    const beforeData = change.before.data();

    // Caso 1: Nova tarefa
    if (!change.before.exists) {
      const payload: CustomMessagingPayload = {
        notification: {
          title: "Nova Tarefa!",
          body: `A tarefa '${taskData.title}' foi criada.`,
          icon: "/icon-192x192.png",
        },
        webpush: {
          notification: {
            icon: "/icon-192x192.png",
            badge: "/badge-trophy.png",
          },
          fcmOptions: { link: `/?workgroup=${workgroupId}` },
        },
      };
      return sendNotificationToGroup(workgroupId, payload, taskData.assignedUserId);
    }

    // Caso 2: Mudança de status
    if (beforeData && beforeData.status !== taskData.status) {
      const changedByUserLog = taskData.statusHistory?.slice(-1)[0];
      if (!changedByUserLog) return null;

      let userName = "Alguém";
      try {
        const userProfileSnap = await db.doc(`users/${changedByUserLog.userId}/profile/${changedByUserLog.userId}`).get();
        if (userProfileSnap.exists) {
          userName = userProfileSnap.data()?.name || "Alguém";
        }
      } catch (err) {
        logError("Erro ao buscar o nome do usuário", err);
      }
      
      const payload: CustomMessagingPayload = {
        notification: {
          title: "Status Atualizado!",
          body: `${userName} atualizou '${taskData.title}' para '${taskData.status}'.`,
          icon: "/icon-192x192.png",
        },
        webpush: {
          notification: {
            icon: "/icon-192x192.png",
            badge: "/badge-trophy.png",
          },
          fcmOptions: { link: `/?workgroup=${workgroupId}` },
        },
      };
      return sendNotificationToGroup(workgroupId, payload, changedByUserLog.userId);
    }

    return null;
  });

/**
 * Função agendada para verificar tarefas próximas ao prazo (90% de progresso = 10% restante).
 * Roda a cada 1 hora.
 */
export const checkDeadlines = functions
  .region("southamerica-east1")
  .pubsub.schedule('every 1 hours')
  .onRun(async (context) => {
    const now = new Date();
    info("Iniciando verificação de prazos críticos (90% de progresso)...");

    try {
      // Busca tarefas não finalizadas que ainda não enviaram notificação de prazo
      const tasksSnapshot = await db.collectionGroup('tasks')
        .where('status', 'in', ['Pendente', 'Em Produção'])
        .where('deadlineNotificationSent', '==', false)
        .get();

      if (tasksSnapshot.empty) return null;

      const promises = tasksSnapshot.docs.map(async (docSnap) => {
        const task = docSnap.data();
        const start = task.createdAt?.toDate ? task.createdAt.toDate() : (task.createdAt ? new Date(task.createdAt) : null);
        const end = task.deadlineAt?.toDate ? task.deadlineAt.toDate() : (task.deadlineAt ? new Date(task.deadlineAt) : null);

        if (!start || !end) return;

        const totalDuration = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();
        
        if (totalDuration <= 0) return;

        const progress = (elapsed / totalDuration) * 100;

        // Se o progresso atingiu 90% (restam 10% do tempo)
        if (progress >= 90 && progress < 100) {
          info(`Urgência: Tarefa '${task.title}' atingiu 90% do prazo.`);
          
          const payload: CustomMessagingPayload = {
            notification: {
              title: "Prazo Crítico!",
              body: `Resta apenas 10% do prazo para a tarefa '${task.title}'!`,
              icon: "/icon-192x192.png",
            },
            webpush: {
              notification: {
                icon: "/icon-192x192.png",
                badge: "/badge-trophy.png",
              },
              fcmOptions: { link: `/?workgroup=${task.workGroupId}` },
            },
          };

          await sendNotificationToGroup(task.workGroupId, payload);
          // Marca como notificado universalmente
          await docSnap.ref.update({ deadlineNotificationSent: true });
        }
      });

      await Promise.all(promises);
    } catch (error) {
      logError("Erro ao verificar prazos:", error);
    }
    return null;
  });

/**
 * Envia notificação para todos os membros de um grupo.
 */
async function sendNotificationToGroup(
  workgroupId: string,
  payload: CustomMessagingPayload,
  excludeUserId: string | null = null,
) {
  const membersSnapshot = await db.collection(`workgroups/${workgroupId}/memberships`).get();
  if (membersSnapshot.empty) return;

  const memberIds = membersSnapshot.docs
      .map((doc) => doc.data().userProfileId)
      .filter((id) => id && id !== excludeUserId);

  if (memberIds.length === 0) return;

  const profilePromises = memberIds.map((userId) => db.doc(`users/${userId}/profile/${userId}`).get());
  const profileSnaps = await Promise.all(profilePromises);

  const tokens = profileSnaps
    .map((snap) => snap.data()?.fcmToken)
    .filter((token): token is string => !!token);

  if (tokens.length === 0) return;

  try {
    // Usamos o método mais compatível para envios múltiplos
    await messaging.sendToDevice(tokens, payload as any);
  } catch (err) {
    logError("Erro ao enviar notificação FCM:", err);
  }
}
