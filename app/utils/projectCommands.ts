import type { Message } from 'ai';
import { generateId } from './fileUtils';

export interface ProjectCommands {
  type: string;
  setupCommand?: string;
  startCommand?: string;
  followupMessage: string;
}

interface FileContent {
  content: string;
  path: string;
}

function detectPackageManager(files: FileContent[], packageManagerField?: string): 'bun' | 'pnpm' | 'yarn' | 'npm' {
  const declaredManager = packageManagerField?.split('@')[0];

  if (declaredManager === 'bun' || declaredManager === 'pnpm' || declaredManager === 'yarn' || declaredManager === 'npm') {
    return declaredManager;
  }

  if (files.some((file) => file.path.endsWith('bun.lock') || file.path.endsWith('bun.lockb'))) {
    return 'bun';
  }

  if (files.some((file) => file.path.endsWith('pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (files.some((file) => file.path.endsWith('yarn.lock'))) {
    return 'yarn';
  }

  return 'npm';
}

function getInstallCommand(packageManager: 'bun' | 'pnpm' | 'yarn' | 'npm'): string {
  switch (packageManager) {
    case 'bun':
      return 'bun install';
    case 'pnpm':
      return 'pnpm install --frozen-lockfile=false';
    case 'yarn':
      return 'yarn install --non-interactive';
    case 'npm':
    default:
      return 'npm install';
  }
}

function getRunCommand(packageManager: 'bun' | 'pnpm' | 'yarn' | 'npm', scriptName: string): string {
  switch (packageManager) {
    case 'bun':
      return `bun run ${scriptName}`;
    case 'pnpm':
      return `pnpm run ${scriptName}`;
    case 'yarn':
      return `yarn ${scriptName}`;
    case 'npm':
    default:
      return `npm run ${scriptName}`;
  }
}

// Helper function to make any command non-interactive
function makeNonInteractive(command: string): string {
  // Set environment variables for non-interactive mode
  const envVars = 'export CI=true DEBIAN_FRONTEND=noninteractive FORCE_COLOR=0';

  // Common interactive packages and their non-interactive flags
  const interactivePackages = [
    { pattern: /npx\s+([^@\s]+@?[^\s]*)\s+init/g, replacement: 'echo "y" | npx --yes $1 init --defaults --yes' },
    { pattern: /npx\s+create-([^\s]+)/g, replacement: 'npx --yes create-$1 --template default' },
    { pattern: /npx\s+([^@\s]+@?[^\s]*)\s+add/g, replacement: 'npx --yes $1 add --defaults --yes' },
    { pattern: /npm\s+install(?!\s+--)/g, replacement: 'npm install --yes --no-audit --no-fund --silent' },
    { pattern: /yarn\s+add(?!\s+--)/g, replacement: 'yarn add --non-interactive' },
    { pattern: /pnpm\s+add(?!\s+--)/g, replacement: 'bun add' },
  ];

  let processedCommand = command;

  // Apply replacements for known interactive patterns
  interactivePackages.forEach(({ pattern, replacement }) => {
    processedCommand = processedCommand.replace(pattern, replacement);
  });

  return `${envVars} && ${processedCommand}`;
}

export async function detectProjectCommands(files: FileContent[]): Promise<ProjectCommands> {
  const hasFile = (name: string) => files.some((f) => f.path.endsWith(name));
  const hasFileContent = (name: string, content: string) =>
    files.some((f) => f.path.endsWith(name) && f.content.includes(content));

  if (hasFile('package.json')) {
    const packageJsonFile = files.find((f) => f.path.endsWith('package.json'));

    if (!packageJsonFile) {
      return { type: '', setupCommand: '', followupMessage: '' };
    }

    try {
      const packageJson = JSON.parse(packageJsonFile.content);
      const scripts = packageJson?.scripts || {};
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      const packageManager = detectPackageManager(files, packageJson?.packageManager);

      // Check if this is a shadcn project
      const isShadcnProject =
        hasFileContent('components.json', 'shadcn') ||
        Object.keys(dependencies).some((dep) => dep.includes('shadcn')) ||
        hasFile('components.json');

      // Check for preferred commands in priority order
      const preferredCommands = ['dev', 'start', 'preview'];
      const availableCommand = preferredCommands.find((cmd) => scripts[cmd]);

      // Build setup command with non-interactive handling
      let baseSetupCommand = `npx update-browserslist-db@latest && ${getInstallCommand(packageManager)}`;

      // Add shadcn init if it's a shadcn project
      if (isShadcnProject) {
        baseSetupCommand += ' && npx shadcn@latest init';
      }

      const setupCommand = makeNonInteractive(baseSetupCommand);

      if (availableCommand) {
        return {
          type: 'Node.js',
          setupCommand,
          startCommand: getRunCommand(packageManager, availableCommand),
          followupMessage: `Found "${availableCommand}" script in package.json. Running "${getRunCommand(packageManager, availableCommand)}" after installation.`,
        };
      }

      return {
        type: 'Node.js',
        setupCommand,
        followupMessage:
          'Would you like me to inspect package.json to determine the available scripts for running this project?',
      };
    } catch (error) {
      console.error('Error parsing package.json:', error);
      return { type: '', setupCommand: '', followupMessage: '' };
    }
  }

  if (hasFile('index.html')) {
    return {
      type: 'Static',
      startCommand: 'npx --yes serve',
      followupMessage: '',
    };
  }

  return { type: '', setupCommand: '', followupMessage: '' };
}

export function createCommandsMessage(commands: ProjectCommands): Message | null {
  if (!commands.setupCommand && !commands.startCommand) {
    return null;
  }

  let commandString = '';

  if (commands.setupCommand) {
    commandString += `
<igrizAction type="shell">${commands.setupCommand}</igrizAction>`;
  }

  if (commands.startCommand) {
    commandString += `
<igrizAction type="start">${commands.startCommand}</igrizAction>
`;
  }

  return {
    role: 'assistant',
    content: `
${commands.followupMessage ? `\n\n${commands.followupMessage}` : ''}
<igrizArtifact id="project-setup" title="Project Setup">
${commandString}
</igrizArtifact>`,
    id: generateId(),
    createdAt: new Date(),
  };
}

export function escapeigrizArtifactTags(input: string) {
  // Regular expression to match igrizArtifact tags and their content
  const regex = /(<igrizArtifact[^>]*>)([\s\S]*?)(<\/igrizArtifact>)/g;

  return input.replace(regex, (match, openTag, content, closeTag) => {
    // Escape the opening tag
    const escapedOpenTag = openTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Escape the closing tag
    const escapedCloseTag = closeTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Return the escaped version
    return `${escapedOpenTag}${content}${escapedCloseTag}`;
  });
}

export function escapeigrizAActionTags(input: string) {
  // Regular expression to match igrizArtifact tags and their content
  const regex = /(<igrizAction[^>]*>)([\s\S]*?)(<\/igrizAction>)/g;

  return input.replace(regex, (match, openTag, content, closeTag) => {
    // Escape the opening tag
    const escapedOpenTag = openTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Escape the closing tag
    const escapedCloseTag = closeTag.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Return the escaped version
    return `${escapedOpenTag}${content}${escapedCloseTag}`;
  });
}

export function escapeigrizTags(input: string) {
  return escapeigrizArtifactTags(escapeigrizAActionTags(input));
}

// We have this seperate function to simplify the restore snapshot process in to one single artifact.
export function createCommandActionsString(commands: ProjectCommands): string {
  if (!commands.setupCommand && !commands.startCommand) {
    // Return empty string if no commands
    return '';
  }

  let commandString = '';

  if (commands.setupCommand) {
    commandString += `
<igrizAction type="shell">${commands.setupCommand}</igrizAction>`;
  }

  if (commands.startCommand) {
    commandString += `
<igrizAction type="start">${commands.startCommand}</igrizAction>
`;
  }

  return commandString;
}
