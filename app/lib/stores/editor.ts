import { atom, computed, map, type MapStore, type WritableAtom } from 'nanostores';
import type { EditorDocument, ScrollPosition } from '~/components/editor/codemirror/CodeMirrorEditor';
import { createScopedLogger } from '~/utils/logger';
import type { FileMap, FilesStore } from './files';

const logger = createScopedLogger('EditorStore');

export type EditorDocuments = Record<string, EditorDocument>;

type SelectedFile = WritableAtom<string | undefined>;

export class EditorStore {
  #filesStore: FilesStore;

  selectedFile: SelectedFile = import.meta.hot?.data.selectedFile ?? atom<string | undefined>();
  documents: MapStore<EditorDocuments> = import.meta.hot?.data.documents ?? map({});

  currentDocument = computed([this.documents, this.selectedFile], (documents, selectedFile) => {
    if (!selectedFile) {
      return undefined;
    }

    return documents[selectedFile];
  });

  constructor(filesStore: FilesStore) {
    this.#filesStore = filesStore;

    logger.trace('[INIT] EditorStore initialized');

    if (import.meta.hot) {
      import.meta.hot.data.documents = this.documents;
      import.meta.hot.data.selectedFile = this.selectedFile;
    }
  }

  setDocuments(files: FileMap) {
    const previousDocuments = this.documents.value;

    const fileEntries = Object.entries(files)
      .map(([filePath, dirent]) => {
        if (dirent === undefined || dirent.type === 'folder') {
          return undefined;
        }

        const previousDocument = previousDocuments?.[filePath];

        return [
          filePath,
          {
            value: dirent.content,
            filePath,
            scroll: previousDocument?.scroll,
          },
        ] as [string, EditorDocument];
      })
      .filter(Boolean) as Array<[string, EditorDocument]>;

    logger.debug(`[DOCUMENTS] Setting ${fileEntries.length} documents in editor`);
    
    this.documents.set(Object.fromEntries<EditorDocument>(fileEntries));
  }

  setSelectedFile(filePath: string | undefined) {
    logger.debug(`[SELECT] Selected file changed: ${filePath ?? 'none'}`);
    this.selectedFile.set(filePath);
  }

  updateScrollPosition(filePath: string, position: ScrollPosition) {
    const documents = this.documents.get();
    const documentState = documents[filePath];

    if (!documentState) {
      logger.debug(`[SCROLL] Cannot update scroll, document not found: ${filePath}`);
      return;
    }

    logger.trace(`[SCROLL] Updating scroll position for ${filePath}: line ${position.top}`);

    this.documents.setKey(filePath, {
      ...documentState,
      scroll: position,
    });
  }

  updateFile(filePath: string, newContent: string) {
    const documents = this.documents.get();
    const documentState = documents[filePath];

    if (!documentState) {
      logger.debug(`[UPDATE] Cannot update file, document not found: ${filePath}`);
      return;
    }

    const currentContent = documentState.value;
    const contentChanged = currentContent !== newContent;

    if (contentChanged) {
      logger.debug(`[UPDATE] File content updated: ${filePath} (${newContent.length} bytes)`);
      this.documents.setKey(filePath, {
        ...documentState,
        value: newContent,
      });
    }
  }
}
