import { atom, map, type MapStore, type ReadableAtom, type WritableAtom } from 'nanostores';
import type { EditorDocument, ScrollPosition } from '~/components/editor/codemirror/CodeMirrorEditor';
import { ActionRunner } from '~/lib/runtime/action-runner';
import type { ActionCallbackData, ArtifactCallbackData } from '~/lib/runtime/message-parser';
import { webcontainer } from '~/lib/webcontainer';
import type { ITerminal } from '~/types/terminal';
import { unreachable } from '~/utils/unreachable';
import { createScopedLogger } from '~/utils/logger';
import { EditorStore } from './editor';
import { FilesStore, type FileMap } from './files';
import { PreviewsStore } from './previews';
import { TerminalStore } from './terminal';

const logger = createScopedLogger('WorkbenchStore');

export interface ArtifactState {
  id: string;
  title: string;
  closed: boolean;
  runner: ActionRunner;
}

export type ArtifactUpdateState = Pick<ArtifactState, 'title' | 'closed'>;

type Artifacts = MapStore<Record<string, ArtifactState>>;

export type WorkbenchViewType = 'code' | 'preview';

export class WorkbenchStore {
  #previewsStore = new PreviewsStore(webcontainer);
  #filesStore = new FilesStore(webcontainer);
  #editorStore = new EditorStore(this.#filesStore);
  #terminalStore = new TerminalStore(webcontainer);

  artifacts: Artifacts = import.meta.hot?.data.artifacts ?? map({});

  showWorkbench: WritableAtom<boolean> = import.meta.hot?.data.showWorkbench ?? atom(false);
  currentView: WritableAtom<WorkbenchViewType> = import.meta.hot?.data.currentView ?? atom('code');
  unsavedFiles: WritableAtom<Set<string>> = import.meta.hot?.data.unsavedFiles ?? atom(new Set<string>());
  modifiedFiles = new Set<string>();
  artifactIdList: string[] = [];

  /**
   * When true, we are replaying a previously saved chat from history.
   * In this mode, only essential shell commands (npm install, dev server) are executed.
   * File actions are still written to the WebContainer since it's ephemeral.
   */
  reloadMode: WritableAtom<boolean> = atom(false);

  constructor() {
    logger.trace('[INIT] WorkbenchStore initialized');

    if (import.meta.hot) {
      import.meta.hot.data.artifacts = this.artifacts;
      import.meta.hot.data.unsavedFiles = this.unsavedFiles;
      import.meta.hot.data.showWorkbench = this.showWorkbench;
      import.meta.hot.data.currentView = this.currentView;
    }
  }

  get previews() {
    return this.#previewsStore.previews;
  }

  get files() {
    return this.#filesStore.files;
  }

  get currentDocument(): ReadableAtom<EditorDocument | undefined> {
    return this.#editorStore.currentDocument;
  }

  get selectedFile(): ReadableAtom<string | undefined> {
    return this.#editorStore.selectedFile;
  }

  get firstArtifact(): ArtifactState | undefined {
    return this.#getArtifact(this.artifactIdList[0]);
  }

  get latestArtifact(): ArtifactState | undefined {
    return this.#getArtifact(this.artifactIdList[this.artifactIdList.length - 1]);
  }

  get filesCount(): number {
    return this.#filesStore.filesCount;
  }

  get showTerminal() {
    return this.#terminalStore.showTerminal;
  }

  toggleTerminal(value?: boolean) {
    this.#terminalStore.toggleTerminal(value);
  }

  attachTerminal(terminal: ITerminal) {
    this.#terminalStore.attachTerminal(terminal);
  }

  onTerminalResize(cols: number, rows: number) {
    this.#terminalStore.onTerminalResize(cols, rows);
  }

  setDocuments(files: FileMap) {
    logger.debug(`[DOCUMENTS] Setting documents from file map`);
    this.#editorStore.setDocuments(files);

    if (this.#filesStore.filesCount > 0 && this.currentDocument.get() === undefined) {
      logger.debug('[DOCUMENTS] No document selected, finding first file...');
      // we find the first file and select it
      for (const [filePath, dirent] of Object.entries(files)) {
        if (dirent?.type === 'file') {
          logger.info(`[DOCUMENTS] Auto-selecting first file: ${filePath}`);
          this.setSelectedFile(filePath);
          break;
        }
      }
    }
  }

  setShowWorkbench(show: boolean) {
    logger.debug(`[WORKBENCH] Setting workbench visibility: ${show}`);
    this.showWorkbench.set(show);
  }

  setCurrentDocumentContent(newContent: string) {
    const filePath = this.currentDocument.get()?.filePath;

    if (!filePath) {
      logger.debug('[DOCUMENT] No current document to update content');
      return;
    }

    logger.debug(`[DOCUMENT] Updating content for: ${filePath}`);

    const originalContent = this.#filesStore.getFile(filePath)?.content;
    const unsavedChanges = originalContent !== undefined && originalContent !== newContent;

    this.#editorStore.updateFile(filePath, newContent);

    const currentDocument = this.currentDocument.get();

    if (currentDocument) {
      const previousUnsavedFiles = this.unsavedFiles.get();

      if (unsavedChanges && previousUnsavedFiles.has(currentDocument.filePath)) {
        return;
      }

      const newUnsavedFiles = new Set(previousUnsavedFiles);

      if (unsavedChanges) {
        logger.debug(`[DOCUMENT] Marking file as unsaved: ${filePath}`);
        newUnsavedFiles.add(currentDocument.filePath);
      } else {
        logger.debug(`[DOCUMENT] Marking file as saved: ${filePath}`);
        newUnsavedFiles.delete(currentDocument.filePath);
      }

      this.unsavedFiles.set(newUnsavedFiles);
    }
  }

  setCurrentDocumentScrollPosition(position: ScrollPosition) {
    const editorDocument = this.currentDocument.get();

    if (!editorDocument) {
      return;
    }

    const { filePath } = editorDocument;

    this.#editorStore.updateScrollPosition(filePath, position);
  }

  setSelectedFile(filePath: string | undefined) {
    logger.debug(`[EDITOR] Selecting file: ${filePath ?? 'none'}`);
    this.#editorStore.setSelectedFile(filePath);
  }

  async saveFile(filePath: string) {
    logger.info(`[SAVE] Saving file: ${filePath}`);
    const documents = this.#editorStore.documents.get();
    const document = documents[filePath];

    if (document === undefined) {
      logger.warn(`[SAVE] Document not found: ${filePath}`);
      return;
    }

    await this.#filesStore.saveFile(filePath, document.value);

    const newUnsavedFiles = new Set(this.unsavedFiles.get());
    newUnsavedFiles.delete(filePath);

    this.unsavedFiles.set(newUnsavedFiles);
    logger.info(`[SAVE] File saved successfully: ${filePath}`);
  }

  async saveCurrentDocument() {
    const currentDocument = this.currentDocument.get();

    if (currentDocument === undefined) {
      logger.debug('[SAVE] No current document to save');
      return;
    }

    logger.debug(`[SAVE] Saving current document: ${currentDocument.filePath}`);
    await this.saveFile(currentDocument.filePath);
  }

  resetCurrentDocument() {
    const currentDocument = this.currentDocument.get();

    if (currentDocument === undefined) {
      return;
    }

    const { filePath } = currentDocument;
    const file = this.#filesStore.getFile(filePath);

    if (!file) {
      return;
    }

    this.setCurrentDocumentContent(file.content);
  }

  async saveAllFiles() {
    const unsavedFiles = this.unsavedFiles.get();
    logger.info(`[SAVE] Saving all ${unsavedFiles.size} unsaved files`);

    for (const filePath of unsavedFiles) {
      await this.saveFile(filePath);
    }

    logger.info('[SAVE] All files saved');
  }

  getFileModifcations() {
    return this.#filesStore.getFileModifications();
  }

  resetAllFileModifications() {
    this.#filesStore.resetFileModifications();
  }

  abortAllActions() {
    // TODO: what do we wanna do and how do we wanna recover from this?
  }

  addArtifact({ messageId, title, id }: ArtifactCallbackData) {
    const artifact = this.#getArtifact(messageId);

    if (artifact) {
      logger.debug(`[ARTIFACT] Artifact already exists: ${messageId}`);
      return;
    }

    logger.info(`[ARTIFACT] Adding new artifact - ID: ${messageId}, Title: ${title}`);

    if (!this.artifactIdList.includes(messageId)) {
      this.artifactIdList.push(messageId);
    }

    this.artifacts.setKey(messageId, {
      id,
      title,
      closed: false,
      runner: new ActionRunner(webcontainer),
    });
  }

  updateArtifact({ messageId }: ArtifactCallbackData, state: Partial<ArtifactUpdateState>) {
    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      logger.warn(`[ARTIFACT] Cannot update, artifact not found: ${messageId}`);
      return;
    }

    logger.debug(`[ARTIFACT] Updating artifact ${messageId}:`, state);
    this.artifacts.setKey(messageId, { ...artifact, ...state });
  }

  async addAction(data: ActionCallbackData) {
    const { messageId } = data;

    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      unreachable('Artifact not found');
    }

    logger.debug(`[ACTION] Adding action to artifact ${messageId}`);
    artifact.runner.addAction(data);
  }

  async runAction(data: ActionCallbackData) {
    const { messageId } = data;

    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      unreachable('Artifact not found');
    }

    /**
     * In reload mode, skip non-essential shell commands to avoid
     * re-compiling/re-deploying contracts and wasting gas.
     */
    if (this.reloadMode.get() && data.action.type === 'shell') {
      if (!this.#isEssentialShellCommand(data.action.content)) {
        logger.info(`[RELOAD] Skipping non-essential shell command: ${data.action.content}`);
        artifact.runner.skipAction(data);

        return;
      }

      logger.info(`[RELOAD] Running essential shell command: ${data.action.content}`);
    }

    artifact.runner.runAction(data);
  }

  /**
   * Determines if a shell command is essential and must run even on reload.
   * Essential commands: package install (npm install) and dev server (npm run dev).
   * Non-essential: compilation, deployment, scaffolding, etc.
   */
  #isEssentialShellCommand(command: string): boolean {
    const trimmed = command.trim().toLowerCase();

    // package manager install commands
    if (/\b(npm\s+(install|i|ci)|pnpm\s+(install|i)|yarn(\s+install)?|bun\s+(install|i))\b/.test(trimmed)) {
      return true;
    }

    // dev server / start commands
    if (
      /\b(npm\s+run\s+(dev|start|preview)|npm\s+start|npx\s+vite|pnpm\s+(dev|start)|yarn\s+(dev|start))\b/.test(trimmed)
    ) {
      return true;
    }

    return false;
  }

  #getArtifact(id: string) {
    const artifacts = this.artifacts.get();
    return artifacts[id];
  }
}

export const workbenchStore = new WorkbenchStore();
