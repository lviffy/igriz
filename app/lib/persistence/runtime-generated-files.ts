import type { Message } from 'ai';
import type { FileMap } from '~/lib/stores/files';
import { WORK_DIR } from '~/utils/constants';
import { createScopedLogger } from '~/utils/logger';
import { getMessages, getSnapshot, openDatabase, setSnapshot } from './db';
import type { Snapshot } from './types';

const logger = createScopedLogger('RuntimeGeneratedFiles');

function getCurrentChatIdFromLocation() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const match = window.location.pathname.match(/\/chat\/([^/?#]+)/);

  return match?.[1];
}

function getSnapshotAnchorMessageId(messages: Message[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index]?.role === 'assistant') {
      return messages[index].id;
    }
  }

  return messages[messages.length - 1]?.id;
}

function normalizeSnapshotPath(filePath: string) {
  let normalizedPath = filePath;

  if (normalizedPath.startsWith(WORK_DIR)) {
    normalizedPath = normalizedPath.slice(WORK_DIR.length);
  }

  return normalizedPath.replace(/^\/+/, '');
}

function normalizeSnapshotFiles(files: FileMap): FileMap {
  return Object.fromEntries(
    Object.entries(files).map(([filePath, value]) => [normalizeSnapshotPath(filePath), value]),
  ) as FileMap;
}

function normalizeSnapshot(snapshot?: Snapshot): Snapshot {
  return {
    chatIndex: snapshot?.chatIndex || '',
    files: normalizeSnapshotFiles(snapshot?.files || {}),
    summary: snapshot?.summary,
  };
}

export async function persistGeneratedFilesToCurrentChatSnapshot(files: Record<string, string>) {
  const currentChatRouteId = getCurrentChatIdFromLocation();

  if (!currentChatRouteId || Object.keys(files).length === 0) {
    return;
  }

  const db = await openDatabase();

  if (!db) {
    return;
  }

  try {
    const chat = await getMessages(db, currentChatRouteId);

    if (!chat) {
      return;
    }

    const snapshot = normalizeSnapshot(await getSnapshot(db, chat.id));
    const chatIndex = snapshot.chatIndex || getSnapshotAnchorMessageId(chat.messages);

    if (!chatIndex) {
      return;
    }

    const generatedFiles: FileMap = Object.fromEntries(
      Object.entries(files).map(([filePath, content]) => [
        normalizeSnapshotPath(filePath),
        { type: 'file', content, isBinary: false },
      ]),
    ) as FileMap;

    await setSnapshot(db, chat.id, {
      chatIndex,
      summary: snapshot.summary,
      files: {
        ...snapshot.files,
        ...generatedFiles,
      },
    });
  } catch (error) {
    logger.error('Failed to persist runtime-generated files to snapshot', error);
  }
}
