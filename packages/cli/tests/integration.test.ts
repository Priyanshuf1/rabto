import { describe, it, expect, beforeEach } from 'vitest';
import { spawnSync, SpawnSyncReturns } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import crypto from 'crypto';
import { computeDirectoryChecksum } from '../src/utils/checksum';

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const CLI_DIST = path.join(PACKAGE_ROOT, 'dist', 'bin', 'rabto.js');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '../..');

if (!fs.existsSync(path.join(REPO_ROOT, 'skills'))) {
  throw new Error(`REPO_ROOT sanity check failed: no 'skills' dir at ${REPO_ROOT}`);
}

function cli(args: string[], extraEnv: Record<string, string> = {}, cwd?: string): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [CLI_DIST, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      RABTO_ROOT: REPO_ROOT,
      ...extraEnv,
    },
    cwd: cwd || process.cwd(),
  });
}

function createTempWorkspace(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rabto-test-ws-'));
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: "mock-ws" }));
  return tmpDir;
}

function createTempRemoteRepo(): string {
  const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'rabto-remote-repo-'));
  
  // Initialize git
  spawnSync('git', ['init'], { cwd: tmpRepo });
  spawnSync('git', ['config', 'user.name', 'test'], { cwd: tmpRepo });
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmpRepo });
  spawnSync('git', ['config', 'core.autocrlf', 'false'], { cwd: tmpRepo });

  // Copy real skills over (skip huge ui-ux-pro-max to keep test fixture git operations fast)
  fs.copySync(path.join(REPO_ROOT, 'skills'), path.join(tmpRepo, 'skills'), {
    filter: (src) => !src.includes('ui-ux-pro-max')
  });
  fs.copySync(path.join(REPO_ROOT, 'registry'), path.join(tmpRepo, 'registry'));
  
  spawnSync('git', ['add', '.'], { cwd: tmpRepo });
  spawnSync('git', ['commit', '-m', 'initial'], { cwd: tmpRepo });
  
  // ensure there's a master branch
  spawnSync('git', ['branch', '-M', 'master'], { cwd: tmpRepo });
  
  return tmpRepo;
}

describe('CLI Integration Tests (real temp directories)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempWorkspace();
  });

  it('install rejects path traversal skill names', () => {
    const r = cli(['install', '--skills', '../etc/passwd'], {}, tmpDir);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('Invalid skill ID');
  });

  it('install a real skill into temp workspace dir', () => {
    const r = cli(['install', '--skills', 'threejs-foundations', '--target', 'antigravity'], {}, tmpDir);
    expect(r.status).toBe(0);
    const destSkill = path.join(tmpDir, '.agents', 'skills', 'threejs-foundations');
    expect(fs.existsSync(destSkill)).toBe(true);
    expect(fs.existsSync(path.join(destSkill, 'SKILL.md'))).toBe(true);
  });

  it('uninstall refuses to remove a locally modified skill without --force', () => {
    cli(['install', '--skills', 'threejs-foundations', '--target', 'antigravity'], {}, tmpDir);
    const skillPath = path.join(tmpDir, '.agents', 'skills', 'threejs-foundations');
    fs.appendFileSync(path.join(skillPath, 'SKILL.md'), '\nMODIFIED');
    
    const r = cli(['uninstall', '--skills', 'threejs-foundations'], {}, tmpDir);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('has been modified locally');
  });

  it('uninstall removes modified skill with --force', () => {
    cli(['install', '--skills', 'threejs-foundations', '--target', 'antigravity'], {}, tmpDir);
    const skillPath = path.join(tmpDir, '.agents', 'skills', 'threejs-foundations');
    fs.appendFileSync(path.join(skillPath, 'SKILL.md'), '\nMODIFIED');
    
    const r = cli(['uninstall', '--skills', 'threejs-foundations', '--force'], {}, tmpDir);
    expect(r.status).toBe(0);
    expect(fs.existsSync(skillPath)).toBe(false);
  });

  it('update fetches from remote and applies cleanly (using git fixture)', async () => {
    // We need a remote repo
    const remoteRepo = createTempRemoteRepo();
    
    // We install from the current REPO_ROOT
    cli(['install', '--skills', 'threejs-foundations', '--target', 'antigravity'], { RABTO_ROOT: remoteRepo }, tmpDir);
    
    // Now we update the remote repo to simulate upstream changes
    const targetSkill = path.join(remoteRepo, 'skills', 'threejs-foundations');
    fs.appendFileSync(path.join(targetSkill, 'SKILL.md'), '\nUPSTREAM UPDATE');
    
    // Regenerate checksums in the remote repo
    const newHash = await computeDirectoryChecksum(targetSkill);
    const checksumsPath = path.join(remoteRepo, 'registry', 'checksums.json');
    const checksums = fs.readJsonSync(checksumsPath);
    checksums['threejs-foundations'] = newHash;
    fs.writeJsonSync(checksumsPath, checksums);
    
    spawnSync('git', ['add', '.'], { cwd: remoteRepo });
    spawnSync('git', ['commit', '-m', 'update'], { cwd: remoteRepo });
    
    // Run update pointing to our remote repo
    const r = cli(['update', '--target', 'antigravity'], {
      RABTO_REMOTE_REPO: `file://${remoteRepo.replace(/\\/g, '/')}`
    }, tmpDir);
    
    if (r.status !== 0) console.error("UPDATE ERROR:", r.stderr, r.stdout);
    expect(r.status).toBe(0);
    
    const manifestPath = path.join(tmpDir, '.agents', 'skills', '.rabto-manifest.json');
    const manifestNew = fs.readJsonSync(manifestPath);
    expect(manifestNew.installed['threejs-foundations'].installedSourceHash).toBe(newHash);
  }, 20000);

  it('update rejects mismatched checksums from upstream', () => {
    const remoteRepo = createTempRemoteRepo();
    cli(['install', '--skills', 'threejs-foundations', '--target', 'antigravity'], { RABTO_ROOT: remoteRepo }, tmpDir);
    
    // Modify checksums.json in remote to point to a fake hash, but don't modify files
    const checksumsPath = path.join(remoteRepo, 'registry', 'checksums.json');
    const checksums = fs.readJsonSync(checksumsPath);
    checksums['threejs-foundations'] = 'fake_hash_123';
    fs.writeJsonSync(checksumsPath, checksums);
    
    spawnSync('git', ['add', '.'], { cwd: remoteRepo });
    spawnSync('git', ['commit', '-m', 'sneaky update with fake checksum'], { cwd: remoteRepo });
    
    const r = cli(['update', '--target', 'antigravity'], {
      RABTO_REMOTE_REPO: `file://${remoteRepo.replace(/\\/g, '/')}`
    }, tmpDir);
    
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('Checksum mismatch');
  }, 20000);

  it('update refuses to overwrite a locally modified skill without --force', async () => {
    const remoteRepo = createTempRemoteRepo();
    cli(['install', '--skills', 'threejs-foundations', '--target', 'antigravity'], { RABTO_ROOT: remoteRepo }, tmpDir);
    
    // Modify locally
    const localSkill = path.join(tmpDir, '.agents', 'skills', 'threejs-foundations');
    fs.appendFileSync(path.join(localSkill, 'SKILL.md'), '\nLOCAL MODIFICATION');
    
    // Modify remote
    const targetSkill = path.join(remoteRepo, 'skills', 'threejs-foundations');
    fs.appendFileSync(path.join(targetSkill, 'SKILL.md'), '\nUPSTREAM UPDATE');
    
    // Regenerate checksum
    const newHash = await computeDirectoryChecksum(targetSkill);
    const checksumsPath = path.join(remoteRepo, 'registry', 'checksums.json');
    const checksums = fs.readJsonSync(checksumsPath);
    checksums['threejs-foundations'] = newHash;
    fs.writeJsonSync(checksumsPath, checksums);
    
    spawnSync('git', ['add', '.'], { cwd: remoteRepo });
    spawnSync('git', ['commit', '-m', 'update'], { cwd: remoteRepo });
    
    const r = cli(['update', '--target', 'antigravity'], {
      RABTO_REMOTE_REPO: `file://${remoteRepo.replace(/\\/g, '/')}`
    }, tmpDir);
    
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('modified locally');
  }, 20000);

  it('update handles HTTP/git failure gracefully (offline test)', () => {
    cli(['install', '--skills', 'threejs-foundations'], {}, tmpDir);
    const r = cli(['update'], {
      RABTO_REMOTE_REPO: 'https://invalid.github.url.that.does.not.exist/repo.git'
    }, tmpDir);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('Could not fetch');
  });

  it('backup creates a valid backup manifest and restore validates it', () => {
    cli(['install', '--skills', 'threejs-foundations'], {}, tmpDir);
    const r = cli(['backup'], {}, tmpDir);
    expect(r.status).toBe(0);

    const backupDirMatch = r.stdout.match(/Backup created at: (.*)/);
    expect(backupDirMatch).toBeTruthy();
    const backupDir = backupDirMatch![1].trim();
    expect(fs.existsSync(path.join(backupDir, 'backup-metadata.json'))).toBe(true);

    fs.emptyDirSync(path.join(tmpDir, '.agents', 'skills'));
    const r2 = cli(['restore', backupDir], {}, tmpDir);
    expect(r2.status).toBe(0);
    expect(fs.existsSync(path.join(tmpDir, '.agents', 'skills', 'threejs-foundations'))).toBe(true);
  });

  it('restore rejects an invalid non-backup directory', () => {
    const fakeBackup = path.join(tmpDir, 'fake-backup');
    fs.mkdirSync(fakeBackup);
    const r = cli(['restore', fakeBackup], {}, tmpDir);
    expect(r.status).not.toBe(0);
  });

  it('install rejects unknown target', () => {
    const r = cli(['install', '--skills', 'threejs-foundations', '--target', 'invalid-agent']);
    expect(r.status).not.toBe(0);
  });
});
