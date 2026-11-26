import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { info, log, error as logError } from "firebase-functions/logger";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

export const ontaskchange = onDocumentWritten({
  document: "/workgroups/{workgroupId}/tasks/{taskId}",
  region: "southamerica-east1"
}, async (event) => {
    const { workgroupId, taskId } = event.params;
    const change = event.data;
    if (!change) return null;

    // Se deletado, logamos e saímos
    if (!change.after.exists) {
      log(`Tarefa ${taskId} excluída no grupo ${workgroupId}.`);
      return null;
    }

    const taskData = change.after.data();
    if (!taskData) return null;

    const beforeData = change.before.exists ? change.before.data() : null;

    let title = "";
    let body = "";
    let originUserId = taskData.assignedUserId;

    // Obtém o nome do grupo para a notificação contextual
    let groupName = "um grupo";
    try {
      const groupSnap = await db.doc(`workgroups/${workgroupId}`).get();
      if (groupSnap.exists) {
        groupName = groupSnap.data()?.name || "um grupo";
      }
    } catch (e) {
      logError("Erro ao buscar nome do grupo", e);
    }

    // Caso 1: Nova tarefa criada
    if (!change.before.exists) {
      title = "Nova Tarefa!";
      body = `A tarefa '${taskData.title}' foi criada no grupo ${groupName}.`;
    }
    // Caso 2: Mudança de status (Progresso individual por grupo)
    else if (beforeData && beforeData.status !== taskData.status) {
      const history = taskData.statusHistory || [];
      const lastAction = history[history.length - 1];
      originUserId = lastAction?.userId || taskData.assignedUserId;

      let userName = "Um membro";
      try {
        const userProfileSnap = await db.doc(`users/${originUserId}/profile/${originUserId}`).get();
        if (userProfileSnap.exists) {
            userName = userProfileSnap.data()?.name || "Um membro";
        }
      } catch (e) {
        logError("Erro ao buscar perfil do usuário", e);
      }

      title = "Status Atualizado";
      body = `${userName} atualizou '${taskData.title}' para ${taskData.status} em ${groupName}.`;
    }

    if (title && body) {
      return sendNotificationToGroup(workgroupId, title, body, originUserId);
    }

    return null;
});

async function sendNotificationToGroup(workgroupId: string, title: string, body: string, excludeUserId: string) {
  try {
    const memberships = await db.collection(`workgroups/${workgroupId}/memberships`).get();
    if (memberships.empty) return;

    const userIds = memberships.docs
      .map(d => d.data().userProfileId)
      .filter(id => id && id !== excludeUserId);

    if (userIds.length === 0) return;

    const tokens: string[] = [];
    for (const uid of userIds) {
      const profile = await db.doc(`users/${uid}/profile/${uid}`).get();
      const token = profile.data()?.fcmToken;
      if (token) tokens.push(token);
    }

    if (tokens.length === 0) return;

    const messages = tokens.map(token => ({
      token,
      notification: { title, body },
      webpush: {
        fcmOptions: {
          link: `/?workgroup=${workgroupId}`
        }
      }
    }));

    await messaging.sendEach(messages);
    info(`Notificações enviadas para ${tokens.length} membros do grupo ${workgroupId}.`);
  } catch (e) {
    logError("Erro ao enviar notificações FCM", e);
  }
}