#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { spawnSync } from 'child_process';
import { computeDirectoryChecksum } from '../utils/checksum';

const program = new Command();

const RABTO_ROOT = process.env.RABTO_ROOT
  ? path.resolve(process.env.RABTO_ROOT)
  : path.resolve(__dirname, '../../../../');

const SKILLS_DIR = path.join(RABTO_ROOT, 'skills');
const REGISTRY_PATH = path.join(RABTO_ROOT, 'registry', 'skills.json');
const PRESETS_PATH = path.join(RABTO_ROOT, 'registry', 'presets.json');
const CHECKSUMS_PATH = path.join(RABTO_ROOT, 'registry', 'checksums.json');

program
  .name('rabto')
  .description('Rabto AI Skills CLI - Installable creative-web skills for AI coding agents.')
  .version('0.1.0');

// ─── SECURITY: Boundary-safe path join ────────────────────────────────────────
function safeJoin(base: string, target: string): string {
  if (!/^[a-zA-Z0-9-_]+$/.test(target)) {
    throw new Error(`Invalid skill ID format: "${target}"`);
  }
  const resolvedBase = fs.existsSync(base) ? fs.realpathSync(base) : path.resolve(base);
  const candidate = path.resolve(resolvedBase, target);
  const resolvedCandidate = fs.existsSync(candidate) ? fs.realpathSync(candidate) : candidate;
  const rel = path.relative(resolvedBase, resolvedCandidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Path traversal detected: "${target}" escapes base "${base}"`);
  }
  return resolvedCandidate;
}

// ─── ADAPTERS ──────────────────────────────────────────────────────────────────
const ADAPTERS: Record<string, { path: (scope: string) => string; verified: boolean; note?: string }> = {
  antigravity: {
    path: (scope) => scope === 'global' ? path.join(os.homedir(), '.gemini', 'config', 'skills') : path.join(process.cwd(), '.agents', 'skills'),
    verified: true,
  },
  'claude-code': {
    path: (scope) => scope === 'global' ? path.join(os.homedir(), '.claude', 'skills') : path.join(process.cwd(), '.claude', 'skills'),
    verified: false,
    note: 'EXPERIMENTAL - Claude Code skill path not yet officially documented.',
  },
  'gemini-cli': {
    path: (scope) => scope === 'global' ? path.join(os.homedir(), '.config', 'gemini', 'skills') : path.join(process.cwd(), '.gemini', 'skills'),
    verified: false,
    note: 'EXPERIMENTAL - Gemini CLI skill path not yet officially documented.',
  },
};

function getTargetDir(target: string, scope: string): string {
  const adapter = ADAPTERS[target];
  if (!adapter) {
    console.error(`Error: Unknown adapter '${target}'. Run 'rabto adapters' to see supported targets.`);
    process.exit(1);
  }
  if (scope !== 'workspace' && scope !== 'global') {
    console.error(`Error: Invalid scope '${scope}'. Must be 'workspace' or 'global'.`);
    process.exit(1);
  }
  if (!adapter.verified) console.warn(`Warning: ${adapter.note}`);
  return adapter.path(scope);
}

// ─── MANIFEST HELPERS ──────────────────────────────────────────────────────────
interface ManifestEntry {
  installedAt: string;
  updatedAt?: string;
  installedSourceHash: string;
  lastVerifiedInstalledHash: string;
  upstreamHash: string;
  backupPath?: string;
  owner: string;
}
interface Manifest {
  version: string;
  agent: string;
  scope: string;
  createdAt: string;
  updatedAt: string;
  installed: Record<string, ManifestEntry>;
}

async function readManifest(manifestPath: string, agent: string, scope: string): Promise<Manifest> {
  if (await fs.pathExists(manifestPath)) return fs.readJson(manifestPath);
  return { version: '1', agent, scope, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), installed: {} };
}

async function checkModified(manifest: Manifest, skill: string, destPath: string): Promise<boolean> {
  const entry = manifest.installed[skill];
  if (!entry) return false;
  if (!fs.existsSync(destPath)) return false;
  const currentHash = await computeDirectoryChecksum(destPath);
  
  if (currentHash !== '' && currentHash !== entry.installedSourceHash) {
    return true; // modified
  }
  return false;
}
// ─── COMMANDS ──────────────────────────────────────────────────────────────────

program
  .command('install')
  .description('Install a skill or preset')
  .option('-t, --target <agent>', 'Target agent', 'antigravity')
  .option('-s, --scope <scope>', 'Installation scope', 'workspace')
  .option('--skills <skills>', 'Comma-separated skill IDs to install')
  .option('--preset <preset>', 'Preset name to install')
  .option('--all', 'Install all available skills')
  .option('--dry-run', 'Simulate without writing files')
  .option('-f, --force', 'Force overwrite modified files')
  .action(async (options) => {
    const targetAgent: string = options.target;
    if (!ADAPTERS[targetAgent]) {
      console.error(`Install failed: Unknown adapter '${targetAgent}'.`);
      console.error(`Run 'rabto adapters' to see supported targets.`);
      process.exit(1);
    }

    let skillsToInstall: string[] = options.skills ? options.skills.split(',').map((s: string) => s.trim()) : [];
    if (options.all) {
      if (!fs.existsSync(SKILLS_DIR)) {
        console.error(`Install failed: Skills directory not found at ${SKILLS_DIR}.`);
        process.exit(1);
      }
      skillsToInstall = await fs.readdir(SKILLS_DIR);
    } else if (options.preset) {
      if (!fs.existsSync(PRESETS_PATH)) {
        console.error(`Install failed: Registry presets not found at ${PRESETS_PATH}.`);
        process.exit(1);
      }
      const presets = await fs.readJson(PRESETS_PATH);
      if (!presets[options.preset]) {
        console.error(`Install failed: Unknown preset '${options.preset}'.`);
        process.exit(1);
      }
      skillsToInstall = presets[options.preset].skills;
    }

    if (skillsToInstall.length === 0) {
      console.error(`Install failed: No skills, preset, or --all supplied.`);
      process.exit(1);
    }

    const targetDir = getTargetDir(targetAgent, options.scope);
    const manifestPath = path.join(targetDir, '.rabto-manifest.json');
    const manifest = await readManifest(manifestPath, targetAgent, options.scope);

    // Dry Run
    if (options.dryRun) {
      console.log(`\n--- DRY RUN ---`);
      console.log(`Target Agent: ${targetAgent}`);
      console.log(`Scope: ${options.scope}`);
      console.log(`Destination: ${targetDir}`);
      console.log(`Skills to install/overwrite:`);
      for (const skill of skillsToInstall) {
        console.log(` - ${skill}`);
      }
      console.log(`\nDry run complete. No target files were changed.`);
      return;
    }

    const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rabto-stage-'));
    // Snapshot state for rollback
    const rollbackState: { skill: string; destPath: string; backupPath?: string; originalUnmanaged?: boolean }[] = [];

    try {
      // 1. Validate and Stage
      for (const skill of skillsToInstall) {
        if (!/^[a-zA-Z0-9-_]+$/.test(skill)) throw new Error(`Invalid skill ID: ${skill}`);
        const sourcePath = path.join(SKILLS_DIR, skill);
        if (!(await fs.pathExists(sourcePath))) throw new Error(`Skill '${skill}' not found in ${SKILLS_DIR}.`);
        
        let destPath: string;
        try {
          destPath = safeJoin(targetDir, skill);
        } catch (e: any) {
          throw new Error(`Security: ${e.message}`);
        }

        const isManaged = manifest.installed[skill] !== undefined;
        const exists = await fs.pathExists(destPath);
        
        if (exists && !isManaged && !options.force) {
          throw new Error(`Collision: Unmanaged skill '${skill}' already exists at destination. Use --force to replace.`);
        }
        
        if (exists && isManaged && await checkModified(manifest, skill, destPath) && !options.force) {
          throw new Error(`Skill '${skill}' has been modified locally. Use --force to overwrite.`);
        }

        await fs.copy(sourcePath, path.join(stagingDir, skill));
      }

      await fs.ensureDir(targetDir); // only create dest if validation passes

      // 2. Transaction apply
      for (const skill of skillsToInstall) {
        const destPath = safeJoin(targetDir, skill);
        const sourceHash = await computeDirectoryChecksum(path.join(stagingDir, skill));
        
        const exists = await fs.pathExists(destPath);
        const isManaged = manifest.installed[skill] !== undefined;
        
        let backupPath;
        let originalUnmanaged = false;

        if (exists) {
          backupPath = `${destPath}.backup-${Date.now()}`;
          await fs.copy(destPath, backupPath);
          if (!isManaged) {
            originalUnmanaged = true;
          }
        }

        rollbackState.push({ skill, destPath, backupPath, originalUnmanaged });

        await fs.copy(path.join(stagingDir, skill), destPath, { overwrite: true });
        
        // Post-install validation
        const installedHash = await computeDirectoryChecksum(destPath);
        if (installedHash !== sourceHash) {
            throw new Error(`Verification failed for '${skill}': Installed hash does not match staging hash.`);
        }

        manifest.installed[skill] = {
          installedAt: manifest.installed[skill]?.installedAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          installedSourceHash: sourceHash,
          lastVerifiedInstalledHash: installedHash,
          upstreamHash: sourceHash,
          backupPath: backupPath || manifest.installed[skill]?.backupPath,
          owner: 'rabto',
        };
      }
      
      manifest.updatedAt = new Date().toISOString();
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    } catch (e: any) {
      console.error(`Install failed: ${e.message}. Rolling back.`);
      // Rollback
      for (const state of rollbackState) {
        if (state.backupPath && await fs.pathExists(state.backupPath)) {
          // Restore original
          await fs.remove(state.destPath);
          await fs.move(state.backupPath, state.destPath);
        } else {
          // Dest didn't exist originally
          await fs.remove(state.destPath);
        }
      }
      await fs.remove(stagingDir);
      process.exit(1);
    }
    await fs.remove(stagingDir);
    console.log('Installation complete.');
  });
program
  .command('uninstall')
  .description('Safely uninstall managed Rabto skills')
  .option('-t, --target <agent>', 'Target agent', 'antigravity')
  .option('-s, --scope <scope>', 'Installation scope', 'workspace')
  .option('--skills <skills>', 'Comma-separated skill IDs')
  .option('-f, --force', 'Force uninstall even if files are modified')
  .action(async (options) => {
    const targetDir = getTargetDir(options.target, options.scope);
    const manifestPath = path.join(targetDir, '.rabto-manifest.json');
    if (!(await fs.pathExists(manifestPath))) {
      console.log('No Rabto manifest found. Nothing to uninstall.');
      return;
    }

    const manifest: Manifest = await fs.readJson(manifestPath);
    const toRemove = options.skills ? options.skills.split(',').map((s: string) => s.trim()) : Object.keys(manifest.installed);

    for (const skill of toRemove) {
      const entry = manifest.installed[skill];
      if (!entry || entry.owner !== 'rabto') {
        console.warn(`Skill '${skill}' is not managed by Rabto. Skipping.`);
        continue;
      }
      
      let destPath: string;
      try {
        destPath = safeJoin(targetDir, skill);
        if (await fs.pathExists(destPath) && await checkModified(manifest, skill, destPath) && !options.force) {
          throw new Error(`Skill '${skill}' has been modified locally. Use --force to uninstall.`);
        }
      } catch (e: any) {
        console.error(`Uninstall failed for '${skill}': ${e.message}`);
        process.exit(1);
      }
      
      if (await fs.pathExists(destPath)) await fs.remove(destPath);
      
      // If we originally replaced an unmanaged directory, restore it from backup
      if (entry.backupPath && await fs.pathExists(entry.backupPath)) {
        await fs.move(entry.backupPath, destPath);
        console.log(`Restored original unmanaged folder for '${skill}'.`);
      }
      
      delete manifest.installed[skill];
    }
    
    if (Object.keys(manifest.installed).length === 0) {
      await fs.remove(manifestPath);
    } else {
      manifest.updatedAt = new Date().toISOString();
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    }
    console.log('Uninstall complete.');
  });

program
  .command('update')
  .description('Fetch the latest skills and update')
  .option('-t, --target <agent>', 'Target agent', 'antigravity')
  .option('-s, --scope <scope>', 'Scope', 'workspace')
  .option('-f, --force', 'Force overwrite modified files')
  .action(async (options) => {
    const targetDir = getTargetDir(options.target, options.scope);
    const manifestPath = path.join(targetDir, '.rabto-manifest.json');
    if (!(await fs.pathExists(manifestPath))) {
      console.error('Update failed: No manifest found. Nothing to update.');
      process.exit(1);
    }

    const remoteRepo = process.env.RABTO_REMOTE_REPO || 'https://github.com/Priyanshuf1/rabto.git';
    const cloneDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rabto-clone-'));
    
    console.log(`Fetching updates from ${remoteRepo}...`);
    const r = spawnSync('git', ['clone', '--depth', '1', '-c', 'core.autocrlf=false', remoteRepo, cloneDir]);
    if (r.status !== 0) {
      console.error('Update failed: Could not fetch from remote repo.');
      await fs.remove(cloneDir);
      process.exit(1);
    }

    const remoteChecksumsPath = path.join(cloneDir, 'registry', 'checksums.json');
    if (!fs.existsSync(remoteChecksumsPath)) {
      console.error('Update failed: Invalid remote repository (missing registry/checksums.json).');
      await fs.remove(cloneDir);
      process.exit(1);
    }
    const remoteChecksums = await fs.readJson(remoteChecksumsPath);

    const manifest: Manifest = await fs.readJson(manifestPath);
    let updatedCount = 0;

    const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rabto-stage-'));
    const rollbackState: { skill: string; destPath: string; backupPath?: string }[] = [];
    const manifestSnapshot = JSON.parse(JSON.stringify(manifest));

    try {
      const toUpdate = [];
      for (const skill of Object.keys(manifest.installed)) {
        const localEntry = manifest.installed[skill];
        const upstreamHash = remoteChecksums[skill];
        if (!upstreamHash) continue;
        
        manifest.installed[skill].upstreamHash = upstreamHash;

        const destPath = safeJoin(targetDir, skill);
        const isModified = await checkModified(manifest, skill, destPath);
        const isOutdated = (localEntry.installedSourceHash !== upstreamHash);

        if (isOutdated) {
          if (isModified && !options.force) {
             throw new Error(`Skill '${skill}' has been modified locally. Use --force to overwrite.`);
          }

          const sourcePath = path.join(cloneDir, 'skills', skill);
          if (!fs.existsSync(sourcePath)) continue;
          
          await fs.copy(sourcePath, path.join(stagingDir, skill));
          
          // Verify checksum before applying
          const stagedHash = await computeDirectoryChecksum(path.join(stagingDir, skill));
          if (stagedHash !== upstreamHash) {
             throw new Error(`Checksum mismatch for '${skill}' in remote repo. Expected ${upstreamHash}, got ${stagedHash}`);
          }
          
          toUpdate.push({ skill, destPath, remoteHash: upstreamHash });
        }
      }

      for (const item of toUpdate) {
        let backupPath;
        if (await fs.pathExists(item.destPath)) {
          backupPath = `${item.destPath}.backup-${Date.now()}`;
          await fs.copy(item.destPath, backupPath);
          manifest.installed[item.skill].backupPath = backupPath;
        }
        
        rollbackState.push({ skill: item.skill, destPath: item.destPath, backupPath });
        
        await fs.copy(path.join(stagingDir, item.skill), item.destPath, { overwrite: true });
        
        const installedHash = await computeDirectoryChecksum(item.destPath);
        if (installedHash !== item.remoteHash) {
            throw new Error(`Verification failed for '${item.skill}': Installed hash does not match staging hash.`);
        }
        
        manifest.installed[item.skill].installedSourceHash = item.remoteHash;
        manifest.installed[item.skill].lastVerifiedInstalledHash = installedHash;
        manifest.installed[item.skill].updatedAt = new Date().toISOString();
        updatedCount++;
      }

      manifest.updatedAt = new Date().toISOString();
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    } catch (e: any) {
      console.error(`Update failed: ${e.message}. Rolling back.`);
      for (const state of rollbackState) {
        if (state.backupPath && await fs.pathExists(state.backupPath)) {
          await fs.remove(state.destPath);
          await fs.move(state.backupPath, state.destPath);
        } else {
          await fs.remove(state.destPath);
        }
      }
      await fs.writeJson(manifestPath, manifestSnapshot, { spaces: 2 }); // Rollback manifest
      await fs.remove(stagingDir);
      await fs.remove(cloneDir);
      process.exit(1);
    }

    await fs.remove(stagingDir);
    await fs.remove(cloneDir);
    console.log(`Updated ${updatedCount} skill(s).`);
  });

program
  .command('backup')
  .description('Create a timestamped backup of installed skills')
  .option('-t, --target <agent>', 'Target agent', 'antigravity')
  .option('-s, --scope <scope>', 'Scope', 'workspace')
  .action(async (options) => {
    const targetDir = getTargetDir(options.target, options.scope);
    const manifestPath = path.join(targetDir, '.rabto-manifest.json');
    if (!(await fs.pathExists(manifestPath))) {
      console.error(`Backup failed: No manifest found in ${targetDir}`);
      process.exit(1);
    }

    const manifest: Manifest = await fs.readJson(manifestPath);
    const backupDest = path.join(path.dirname(targetDir), `.rabto_backup_${Date.now()}`);
    
    await fs.ensureDir(backupDest);
    
    // Only copy Rabto-managed skills
    for (const skill of Object.keys(manifest.installed)) {
      const src = safeJoin(targetDir, skill);
      if (await fs.pathExists(src)) {
        await fs.copy(src, path.join(backupDest, skill));
      }
    }
    
    // Copy the manifest itself
    await fs.copy(manifestPath, path.join(backupDest, '.rabto-manifest.json'));
    
    const backupManifest = {
      isRabtoBackup: true,
      formatVersion: '2',
      timestamp: new Date().toISOString(),
      agent: options.target,
      scope: options.scope,
      originalManifest: manifest
    };
    await fs.writeJson(path.join(backupDest, 'backup-metadata.json'), backupManifest, { spaces: 2 });
    console.log(`Backup created at: ${backupDest}`);
  });

program
  .command('restore')
  .description('Restore skills from a backup directory')
  .argument('<backup-path>', 'Path to backup directory')
  .option('-t, --target <agent>', 'Target agent', 'antigravity')
  .option('-s, --scope <scope>', 'Scope', 'workspace')
  .option('-f, --force', 'Force overwrite modified skills')
  .action(async (backupPath: string, options) => {
    const resolvedBackup = path.resolve(backupPath);
    if (!(await fs.pathExists(resolvedBackup))) {
      console.error(`Restore failed: Backup directory not found at ${resolvedBackup}`);
      process.exit(1);
    }
    
    const backupManifestPath = path.join(resolvedBackup, 'backup-metadata.json');
    if (!(await fs.pathExists(backupManifestPath))) {
      console.error('Restore failed: Invalid backup: Missing backup-metadata.json');
      process.exit(1);
    }
    
    const backupManifest = await fs.readJson(backupManifestPath);
    if (!backupManifest.isRabtoBackup) {
      console.error('Restore failed: Not a valid Rabto backup manifest');
      process.exit(1);
    }
    
    if (backupManifest.agent !== options.target || backupManifest.scope !== options.scope) {
      console.error(`Restore failed: Backup was created for agent='${backupManifest.agent}', scope='${backupManifest.scope}'.`);
      process.exit(1);
    }
    
    const targetDir = getTargetDir(options.target, options.scope);
    const currentManifestPath = path.join(targetDir, '.rabto-manifest.json');
    
    let currentManifest: Manifest | null = null;
    if (await fs.pathExists(currentManifestPath)) {
      currentManifest = await fs.readJson(currentManifestPath);
    }

    await fs.ensureDir(targetDir);
    
    // Restore only managed skills from the backup
    const originalManifest = backupManifest.originalManifest as Manifest;
    for (const skill of Object.keys(originalManifest.installed)) {
      const src = safeJoin(resolvedBackup, skill);
      const dest = safeJoin(targetDir, skill);
      
      if (await fs.pathExists(src)) {
        if (await fs.pathExists(dest)) {
          if (currentManifest && await checkModified(currentManifest, skill, dest) && !options.force) {
            console.error(`Restore failed: Skill '${skill}' has been modified locally. Use --force to replace.`);
            process.exit(1);
          }
          await fs.remove(dest); // clear it
        }
        await fs.copy(src, dest);
      }
    }
    
    await fs.copy(path.join(resolvedBackup, '.rabto-manifest.json'), currentManifestPath);
    console.log('Restore complete.');
  });
program
  .command('list')
  .description('List all available skills from the registry')
  .action(async () => {
    if (!(await fs.pathExists(REGISTRY_PATH))) {
      console.error(`List failed: Registry not found at ${REGISTRY_PATH}`);
      process.exit(1);
    }
    const registry = await fs.readJson(REGISTRY_PATH);
    for (const [id, meta] of Object.entries(registry.skills) as any) {
      console.log(`  ${id.padEnd(40)} [${meta.status ?? 'unknown'}]`);
    }
  });

program
  .command('adapters')
  .description('List supported adapters and their statuses')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const list = Object.entries(ADAPTERS).map(([id, meta]) => ({
      id,
      verified: meta.verified,
      workspaceDestination: meta.path('workspace'),
      globalDestination: meta.path('global'),
      note: meta.note || null
    }));

    if (options.json) {
      console.log(JSON.stringify(list, null, 2));
    } else {
      for (const adapter of list) {
        console.log(`Adapter: ${adapter.id}`);
        console.log(`  Verified: ${adapter.verified ? 'Yes' : 'No'}`);
        console.log(`  Workspace Path: ${adapter.workspaceDestination}`);
        console.log(`  Global Path: ${adapter.globalDestination}`);
        if (adapter.note) console.log(`  Note: ${adapter.note}`);
        console.log();
      }
    }
  });

program
  .command('init')
  .description('Initialize a local Rabto configuration')
  .option('-t, --target <agent>', 'Target agent (e.g. antigravity)')
  .option('-s, --scope <scope>', 'Installation scope (workspace | global)')
  .option('-f, --force', 'Force overwrite existing configuration')
  .action(async (options) => {
    const target = options.target;
    const scope = options.scope;
    
    if (!target) { console.error('Init failed: --target is required.'); process.exit(1); }
    if (!scope) { console.error('Init failed: --scope is required.'); process.exit(1); }
    
    if (!ADAPTERS[target]) {
      console.error(`Init failed: Unknown adapter '${target}'. Run 'rabto adapters'.`);
      process.exit(1);
    }
    if (scope !== 'workspace' && scope !== 'global') {
      console.error(`Init failed: Scope must be 'workspace' or 'global'.`);
      process.exit(1);
    }

    const configPath = path.join(process.cwd(), '.rabto.json');
    if (await fs.pathExists(configPath) && !options.force) {
      console.error(`Init failed: Configuration already exists at ${configPath}. Use --force to overwrite.`);
      process.exit(1);
    }

    await fs.writeJson(configPath, { version: '1', agent: target, scope }, { spaces: 2 });
    console.log(`Configuration saved to ${configPath}`);
    console.log(`Target: ${target}, Scope: ${scope}`);
  });

program
  .command('doctor')
  .description('Run system checks for Rabto')
  .option('-t, --target <agent>', 'Target agent', 'antigravity')
  .option('-s, --scope <scope>', 'Installation scope', 'workspace')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const results: any[] = [];
    let hasError = false;

    function check(name: string, fn: () => boolean | string, req = true) {
      let status = 'FAIL';
      let message = '';
      try {
        const r = fn();
        if (r === true) status = 'PASS';
        else if (typeof r === 'string') { status = 'PASS'; message = r; }
      } catch (e: any) {
        status = req ? 'FAIL' : 'WARN';
        message = e.message;
      }
      results.push({ check: name, status, message });
      if (status === 'FAIL') hasError = true;
    }

    check('Node.js Version', () => process.version);
    check('Rabto Root', () => fs.existsSync(RABTO_ROOT));
    check('Skills Directory', () => fs.existsSync(SKILLS_DIR));
    check('Registry Skills', () => fs.existsSync(REGISTRY_PATH));
    check('Registry Presets', () => fs.existsSync(PRESETS_PATH));
    check('Registry Checksums', () => fs.existsSync(CHECKSUMS_PATH));
    check('Target Adapter Recognized', () => !!ADAPTERS[options.target]);
    
    if (ADAPTERS[options.target]) {
        check('Target Path Resolvable', () => !!getTargetDir(options.target, options.scope));
        const targetDir = getTargetDir(options.target, options.scope);
        check('Target Path Writable', () => {
          if (!fs.existsSync(targetDir)) return true;
          const testFile = path.join(targetDir, '.test-write');
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
          return true;
        });
    }

    check('Git Available', () => spawnSync('git', ['--version']).status === 0);

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      for (const r of results) {
        console.log(`[${r.status}] ${r.check} ${r.message ? `- ${r.message}` : ''}`);
      }
    }

    process.exit(hasError ? 1 : 0);
  });

program
  .command('validate')
  .description('Validate registry and installed metadata')
  .option('--registry', 'Validate registry')
  .option('--installed', 'Validate installed manifest')
  .option('-t, --target <agent>', 'Target agent', 'antigravity')
  .option('-s, --scope <scope>', 'Installation scope', 'workspace')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    let failed = false;

    if (options.registry) {
      // Basic check
      if (!fs.existsSync(CHECKSUMS_PATH)) {
        console.error('Validation failed: Missing registry/checksums.json');
        failed = true;
      } else {
        const checksums = await fs.readJson(CHECKSUMS_PATH);
        if (Object.keys(checksums).length === 0) {
          console.error('Validation failed: Checksums file is empty');
          failed = true;
        } else {
           console.log('Registry validation passed.');
        }
      }
    }

    if (options.installed) {
      const targetDir = getTargetDir(options.target, options.scope);
      const manifestPath = path.join(targetDir, '.rabto-manifest.json');
      if (!fs.existsSync(manifestPath)) {
        console.error('Validation failed: Missing manifest at destination.');
        failed = true;
      } else {
        const manifest = await fs.readJson(manifestPath);
        for (const skill of Object.keys(manifest.installed)) {
          const entry = manifest.installed[skill];
          if (entry.owner !== 'rabto') {
            console.error(`Validation failed: Skill ${skill} is not owned by rabto.`);
            failed = true;
          }
          const hash = await computeDirectoryChecksum(path.join(targetDir, skill));
          if (hash !== entry.installedSourceHash && hash !== entry.lastVerifiedInstalledHash) {
             console.error(`Validation failed: Skill ${skill} hash mismatch. Installed hash differs from manifest.`);
             failed = true;
          }
        }
        if (!failed) console.log('Installed validation passed.');
      }
    }

    if (failed) process.exit(1);
  });

program
  .command('info <skill>')
  .description('Get detailed info about a skill')
  .option('--json', 'Output as JSON')
  .action(async (skill: string, options) => {
    if (!fs.existsSync(REGISTRY_PATH)) {
      console.error('Info failed: Registry not found.');
      process.exit(1);
    }
    const registry = await fs.readJson(REGISTRY_PATH);
    const meta = registry.skills[skill];
    
    if (!meta) {
      console.error(`Info failed: Skill '${skill}' not found.`);
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(meta, null, 2));
    } else {
      console.log(`ID: ${skill}`);
      console.log(`Name: ${meta.name}`);
      console.log(`Version: ${meta.version}`);
      console.log(`Status: ${meta.status}`);
      console.log(`Description: ${meta.description}`);
      console.log(`Categories: ${meta.categories?.join(', ')}`);
      console.log(`Triggers: ${meta.triggers?.join(', ')}`);
      console.log(`Primary Tools: ${meta.primary_tools?.join(', ')}`);
      console.log(`Required Inputs: ${meta.minimum_inputs?.join(', ')}`);
      console.log(`Related Skills: ${meta.related_skills?.join(', ')}`);
      console.log(`Conflicting Skills: ${meta.conflicting_skills?.join(', ')}`);
      console.log(`Verification Required: ${meta.verification_required}`);
      console.log(`Last Reviewed: ${meta.last_reviewed}`);
    }
  });

program.parse(process.argv);
