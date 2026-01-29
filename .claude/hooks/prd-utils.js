#!/usr/bin/env node
/**
 * PRD Utilities - Safe JSON Update with Rollback
 *
 * Provides safe PRD file updates with automatic backup and rollback.
 * - Creates backup before update
 * - Validates JSON before committing
 * - Rolls back on error
 * - Transaction-like behavior for PRD updates
 *
 * Usage:
 *   const prdUtils = require('./prd-utils.js');
 *   await prdUtils.updatePRD('docs/prd-feature.json', (prd) => {
 *     prd.userStories[0].passes = true;
 *     return prd;
 *   });
 *
 * @module prd-utils
 */

const fs = require('fs');
const path = require('path');

// Backup directory
const BACKUP_DIR = '.claude/.prd-backups';

// Maximum number of backups to keep per PRD
const MAX_BACKUPS = 10;

/**
 * Create a backup of a file
 *
 * @param {string} filePath - Path to file to backup
 * @returns {string} Path to backup file
 */
function createBackup(filePath) {
  const backupDir = path.join(path.dirname(filePath), BACKUP_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.basename(filePath);
  const backupPath = path.join(backupDir, `${filename}.${timestamp}.bak`);

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Copy file to backup location
  fs.copyFileSync(filePath, backupPath);

  // Clean old backups (keep only MAX_BACKUPS most recent)
  cleanOldBackups(filePath);

  return backupPath;
}

/**
 * Clean old backups for a file
 *
 * @param {string} originalPath - Original file path
 */
function cleanOldBackups(originalPath) {
  const backupDir = path.join(path.dirname(originalPath), BACKUP_DIR);
  const filename = path.basename(originalPath);

  if (!fs.existsSync(backupDir)) {
    return;
  }

  // Get all backup files for this PRD
  const backupFiles = fs.readdirSync(backupDir)
    .filter(f => f.startsWith(filename) && f.endsWith('.bak'))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // Sort by time descending (newest first)

  // Remove backups beyond MAX_BACKUPS
  if (backupFiles.length > MAX_BACKUPS) {
    const toDelete = backupFiles.slice(MAX_BACKUPS);
    toDelete.forEach(file => {
      fs.unlinkSync(file.path);
    });
  }
}

/**
 * Rollback to a backup file
 *
 * @param {string} originalPath - Original file path
 * @param {string} backupPath - Backup file path
 * @returns {boolean} True if rollback succeeded
 */
function rollback(originalPath, backupPath) {
  try {
    fs.copyFileSync(backupPath, originalPath);
    return true;
  } catch (error) {
    console.error(`Rollback failed: ${error.message}`);
    return false;
  }
}

/**
 * Validate PRD JSON structure
 *
 * @param {object} prd - PRD object to validate
 * @returns {object} Validation result {valid: boolean, errors: string[]}
 */
function validatePRD(prd) {
  const errors = [];

  // Required top-level fields
  const requiredFields = ['project', 'branchName', 'description', 'memorialFile', 'userStories'];
  for (const field of requiredFields) {
    if (!prd[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate userStories array
  if (!Array.isArray(prd.userStories)) {
    errors.push('userStories must be an array');
  } else {
    prd.userStories.forEach((story, index) => {
      const storyPrefix = `userStories[${index}]`;

      // Required story fields
      const requiredStoryFields = ['id', 'title', 'description', 'acceptanceCriteria', 'mavenSteps', 'mcpTools', 'priority', 'passes', 'notes'];
      for (const field of requiredStoryFields) {
        if (story[field] === undefined) {
          errors.push(`${storyPrefix}: missing required field: ${field}`);
        }
      }

      // Validate mavenSteps is array
      if (story.mavenSteps && !Array.isArray(story.mavenSteps)) {
        errors.push(`${storyPrefix}: mavenSteps must be an array`);
      }

      // Validate mcpTools is object
      if (story.mcpTools && typeof story.mcpTools !== 'object') {
        errors.push(`${storyPrefix}: mcpTools must be an object`);
      }

      // Validate acceptanceCriteria is array
      if (story.acceptanceCriteria && !Array.isArray(story.acceptanceCriteria)) {
        errors.push(`${storyPrefix}: acceptanceCriteria must be an array`);
      }

      // Validate priority is number >= 1
      if (typeof story.priority !== 'number' || story.priority < 1) {
        errors.push(`${storyPrefix}: priority must be a number >= 1`);
      }

      // Validate passes is boolean
      if (typeof story.passes !== 'boolean') {
        errors.push(`${storyPrefix}: passes must be a boolean`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Update a PRD file with automatic backup and rollback
 *
 * @param {string} filePath - Path to PRD JSON file
 * @param {function} updateFn - Function that takes the PRD object and returns the updated version
 * @param {object} options - Options {createBackup: true, validate: true}
 * @returns {object} Result {success: boolean, backupPath: string, error: string}
 */
function updatePRD(filePath, updateFn, options = {}) {
  const opts = {
    createBackup: true,
    validate: true,
    ...options
  };

  let backupPath = null;

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: `File not found: ${filePath}`
      };
    }

    // Create backup
    if (opts.createBackup) {
      backupPath = createBackup(filePath);
    }

    // Read current PRD
    const content = fs.readFileSync(filePath, 'utf-8');
    let prd;

    try {
      prd = JSON.parse(content);
    } catch (parseError) {
      return {
        success: false,
        error: `Invalid JSON in ${filePath}: ${parseError.message}`,
        backupPath
      };
    }

    // Apply update function
    let updatedPRD;
    try {
      updatedPRD = updateFn(prd);
    } catch (updateError) {
      // Rollback on update function error
      if (backupPath) {
        rollback(filePath, backupPath);
      }
      return {
        success: false,
        error: `Update function failed: ${updateError.message}`,
        backupPath
      };
    }

    // Validate updated PRD
    if (opts.validate) {
      const validation = validatePRD(updatedPRD);
      if (!validation.valid) {
        // Rollback on validation failure
        if (backupPath) {
          rollback(filePath, backupPath);
        }
        return {
          success: false,
          error: `Validation failed:\n${validation.errors.join('\n')}`,
          backupPath
        };
      }
    }

    // Write updated PRD
    const updatedContent = JSON.stringify(updatedPRD, null, 2);
    fs.writeFileSync(filePath, updatedContent, 'utf-8');

    return {
      success: true,
      backupPath
    };

  } catch (error) {
    // Rollback on unexpected error
    if (backupPath) {
      rollback(filePath, backupPath);
    }
    return {
      success: false,
      error: error.message,
      backupPath
    };
  }
}

/**
 * Mark a story as passed in a PRD
 *
 * @param {string} filePath - Path to PRD JSON file
 * @param {string} storyId - Story ID to mark as passed
 * @returns {object} Result {success: boolean, error: string}
 */
function markStoryPassed(filePath, storyId) {
  return updatePRD(filePath, (prd) => {
    const story = prd.userStories.find(s => s.id === storyId);
    if (!story) {
      throw new Error(`Story ${storyId} not found`);
    }
    story.passes = true;
    return prd;
  });
}

/**
 * Update story notes in a PRD
 *
 * @param {string} filePath - Path to PRD JSON file
 * @param {string} storyId - Story ID to update
 * @param {string} notes - New notes content
 * @returns {object} Result {success: boolean, error: string}
 */
function updateStoryNotes(filePath, storyId, notes) {
  return updatePRD(filePath, (prd) => {
    const story = prd.userStories.find(s => s.id === storyId);
    if (!story) {
      throw new Error(`Story ${storyId} not found`);
    }
    story.notes = notes;
    return prd;
  });
}

/**
 * Get all backup files for a PRD
 *
 * @param {string} filePath - Original PRD file path
 * @returns {array} Array of backup file info {path, timestamp}
 */
function listBackups(filePath) {
  const backupDir = path.join(path.dirname(filePath), BACKUP_DIR);
  const filename = path.basename(filePath);

  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const backupFiles = fs.readdirSync(backupDir)
    .filter(f => f.startsWith(filename) && f.endsWith('.bak'))
    .map(f => {
      const backupPath = path.join(backupDir, f);
      const stats = fs.statSync(backupPath);
      // Extract timestamp from filename
      const timestampMatch = f.match(/\.(\d{4}-\d{2}-\d{2}T[\d-]+)\.bak$/);
      return {
        path: backupPath,
        filename: f,
        timestamp: timestampMatch ? timestampMatch[1] : stats.mtime.toISOString(),
        mtime: stats.mtime
      };
    })
    .sort((a, b) => b.mtime - a.mtime); // Sort by time descending

  return backupFiles;
}

/**
 * Restore a PRD from a backup
 *
 * @param {string} originalPath - Original PRD file path
 * @param {string} backupFilename - Backup filename to restore
 * @returns {object} Result {success: boolean, error: string}
 */
function restoreBackup(originalPath, backupFilename) {
  const backupDir = path.join(path.dirname(originalPath), BACKUP_DIR);
  const backupPath = path.join(backupDir, backupFilename);

  if (!fs.existsSync(backupPath)) {
    return {
      success: false,
      error: `Backup not found: ${backupFilename}`
    };
  }

  try {
    // Create backup of current file before restoring
    const currentBackup = createBackup(originalPath);

    // Copy backup to original location
    fs.copyFileSync(backupPath, originalPath);

    return {
      success: true,
      previousBackup: currentBackup
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// =============================================================================
// NEW: Enhanced Validation, Repair, and Memory Sync Functions
// =============================================================================

/**
 * Discover available MCP servers from Claude Code settings
 *
 * @returns {object} Object with MCP server names as keys and their status
 */
function discoverMCPs() {
  const mcpServers = {};

  // Check user-level settings
  const userSettingsPath = path.join(process.env.HOME || '', '.claude', 'settings.json');
  if (fs.existsSync(userSettingsPath)) {
    try {
      const userSettings = JSON.parse(fs.readFileSync(userSettingsPath, 'utf-8'));
      if (userSettings.mcpServers) {
        Object.keys(userSettings.mcpServers).forEach(mcpName => {
          mcpServers[mcpName] = { status: 'available', source: 'user' };
        });
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Check project-level settings
  const projectSettingsPath = path.join(process.cwd(), '.claude', 'settings.json');
  if (fs.existsSync(projectSettingsPath)) {
    try {
      const projectSettings = JSON.parse(fs.readFileSync(projectSettingsPath, 'utf-8'));
      if (projectSettings.mcpServers) {
        Object.keys(projectSettings.mcpServers).forEach(mcpName => {
          mcpServers[mcpName] = { status: 'available', source: 'project' };
        });
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  return mcpServers;
}

/**
 * Validate PRD against full schema including mavenSteps and mcpTools
 *
 * @param {string} filePath - Path to PRD JSON file
 * @param {object} options - Options {verbose: boolean, availableMCPs: object}
 * @returns {object} Validation result {valid: boolean, errors: string[], warnings: string[]}
 */
function validateSchema(filePath, options = {}) {
  const opts = { verbose: false, availableMCPs: {}, ...options };
  const errors = [];
  const warnings = [];

  // Read and parse PRD
  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      errors: [`File not found: ${filePath}`],
      warnings
    };
  }

  let prd;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    prd = JSON.parse(content);
  } catch (parseError) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${parseError.message}`],
      warnings
    };
  }

  // Discover available MCPs if not provided
  const availableMCPs = Object.keys(opts.availableMCPs).length > 0
    ? opts.availableMCPs
    : discoverMCPs();

  // Validate required top-level fields (updated schema)
  const requiredFields = ['project', 'branchName', 'description', 'userStories'];
  for (const field of requiredFields) {
    if (!prd[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate optional top-level fields
  if (prd.relatedPRDs && !Array.isArray(prd.relatedPRDs)) {
    errors.push('relatedPRDs must be an array');
  }

  // Validate userStories
  if (!Array.isArray(prd.userStories)) {
    errors.push('userStories must be an array');
  } else {
    prd.userStories.forEach((story, index) => {
      const storyPrefix = `userStories[${index}]`;

      // Required story fields (mcpTools is optional - can be empty or omitted)
      const requiredStoryFields = ['id', 'title', 'description', 'acceptanceCriteria', 'mavenSteps', 'priority', 'passes', 'notes'];
      for (const field of requiredStoryFields) {
        if (story[field] === undefined) {
          errors.push(`${storyPrefix}: missing required field: ${field}`);
        }
      }

      // mcpTools is optional - if present, validate it; if not, that's OK
      // Empty mcpTools objects are also acceptable (means no MCPs needed)

      // Validate mavenSteps
      if (story.mavenSteps) {
        if (!Array.isArray(story.mavenSteps)) {
          errors.push(`${storyPrefix}: mavenSteps must be an array`);
        } else {
          // Check each mavenStep is integer between 1-11
          story.mavenSteps.forEach((step, stepIndex) => {
            if (!Number.isInteger(step)) {
              errors.push(`${storyPrefix}.mavenSteps[${stepIndex}]: must be an integer, got ${typeof step}`);
            } else if (step < 1 || step > 11) {
              errors.push(`${storyPrefix}.mavenSteps[${stepIndex}]: must be between 1-11, got ${step}`);
            }
          });

          // Check for duplicates
          const uniqueSteps = new Set(story.mavenSteps);
          if (uniqueSteps.size !== story.mavenSteps.length) {
            warnings.push(`${storyPrefix}.mavenSteps: contains duplicate steps`);
          }
        }
      }

      // Validate mcpTools
      if (story.mcpTools) {
        if (typeof story.mcpTools !== 'object' || Array.isArray(story.mcpTools)) {
          errors.push(`${storyPrefix}: mcpTools must be an object`);
        } else {
          // Validate each MCP reference
          for (const [stepKey, mcps] of Object.entries(story.mcpTools)) {
            // Check stepKey format (step1, step2, etc.)
            if (!/^step\d+$/.test(stepKey)) {
              errors.push(`${storyPrefix}.mcpTools: invalid key "${stepKey}", must be "step1", "step2", etc.`);
              continue;
            }

            // Check it's an array
            if (!Array.isArray(mcps)) {
              errors.push(`${storyPrefix}.mcpTools.${stepKey}: must be an array`);
              continue;
            }

            // Check each MCP exists
            mcps.forEach(mcpName => {
              if (typeof mcpName !== 'string') {
                errors.push(`${storyPrefix}.mcpTools.${stepKey}: MCP name must be string, got ${typeof mcpName}`);
              } else if (Object.keys(availableMCPs).length > 0 && !availableMCPs[mcpName]) {
                warnings.push(`${storyPrefix}.mcpTools.${stepKey}: MCP "${mcpName}" not found in available MCPs`);
              }
            });
          }
        }
      }

      // Validate acceptanceCriteria includes "Typecheck passes"
      if (story.acceptanceCriteria && Array.isArray(story.acceptanceCriteria)) {
        const hasTypecheck = story.acceptanceCriteria.some(
          c => typeof c === 'string' && c.toLowerCase().includes('typecheck')
        );
        if (!hasTypecheck) {
          warnings.push(`${storyPrefix}: missing "Typecheck passes" in acceptanceCriteria`);
        }
      }

      // Validate priority
      if (typeof story.priority !== 'number' || story.priority < 1) {
        errors.push(`${storyPrefix}: priority must be a number >= 1`);
      }

      // Validate passes
      if (typeof story.passes !== 'boolean') {
        errors.push(`${storyPrefix}: passes must be a boolean`);
      }
    });

    // Check for priority duplicates (all stories should have unique priorities)
    const priorities = prd.userStories.map(s => s.priority).filter(p => typeof p === 'number');
    const uniquePriorities = new Set(priorities);
    if (priorities.length !== uniquePriorities.size) {
      warnings.push('Multiple stories have the same priority - stories may execute out of order');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Repair common PRD issues with atomic write
 *
 * @param {string} filePath - Path to PRD JSON file
 * @param {object} options - Options {verbose: boolean, availableMCPs: object, dryRun: boolean}
 * @returns {object} Result {success: boolean, repairs: string[], error: string}
 */
function repairPRD(filePath, options = {}) {
  const opts = { verbose: false, availableMCPs: {}, dryRun: false, ...options };
  const repairs = [];
  let tempFilePath = null;

  try {
    // Read original PRD
    const content = fs.readFileSync(filePath, 'utf-8');
    let prd = JSON.parse(content);

    // Discover available MCPs if not provided
    const availableMCPs = Object.keys(opts.availableMCPs).length > 0
      ? opts.availableMCPs
      : discoverMCPs();

    // Track if we made changes
    let modified = false;

    // Add missing default fields
    const defaults = {
      relatedPRDs: [],
      consolidatedMemory: '',
      lessonsLearned: ''
    };
    for (const [field, defaultValue] of Object.entries(defaults)) {
      if (prd[field] === undefined) {
        prd[field] = defaultValue;
        repairs.push(`Added missing field: ${field}`);
        modified = true;
      }
    }

    // Fix deprecated memorialFile field -> remove or warn
    if (prd.memorialFile && !prd.memorialFile.startsWith('# DEPRECATED')) {
      // Keep but mark as deprecated for compatibility
      repairs.push('Field "memorialFile" is deprecated (use consolidatedMemory)');
    }

    // Fix memorialFile reference in validatePRD - updated schema
    // We don't error on missing memorialFile anymore, but add it if old code expects it
    if (prd.memorialFile === undefined) {
      prd.memorialFile = `docs/memory/${prd.project || 'project'}.md`;
      repairs.push('Added deprecated field "memorialFile" for backward compatibility');
      modified = true;
    }

    // Repair each story
    if (Array.isArray(prd.userStories)) {
      prd.userStories.forEach((story, index) => {
        const storyPrefix = `userStories[${index}]`;

        // Fix mavenSteps
        if (Array.isArray(story.mavenSteps)) {
          const originalLength = story.mavenSteps.length;

          // Remove non-integers and out-of-range values
          story.mavenSteps = story.mavenSteps.filter(step =>
            Number.isInteger(step) && step >= 1 && step <= 11
          );

          // Remove duplicates and sort
          const uniqueSteps = [...new Set(story.mavenSteps)].sort((a, b) => a - b);

          if (uniqueSteps.length !== originalLength) {
            repairs.push(`${storyPrefix}.mavenSteps: removed invalid/duplicate steps`);
            modified = true;
          }

          story.mavenSteps = uniqueSteps;
        }

        // Fix mcpTools - remove non-existent MCPs
        if (story.mcpTools && typeof story.mcpTools === 'object') {
          for (const [stepKey, mcps] of Object.entries(story.mcpTools)) {
            if (Array.isArray(mcps) && Object.keys(availableMCPs).length > 0) {
              const originalLength = mcps.length;
              story.mcpTools[stepKey] = mcps.filter(mcp => availableMCPs[mcp]);

              if (story.mcpTools[stepKey].length !== originalLength) {
                const removed = mcps.filter(mcp => !availableMCPs[mcp]);
                repairs.push(`${storyPrefix}.mcpTools.${stepKey}: removed unavailable MCPs: ${removed.join(', ')}`);
                modified = true;
              }

              // Remove empty arrays
              if (story.mcpTools[stepKey].length === 0) {
                delete story.mcpTools[stepKey];
              }
            }
          }

          // Remove mcpTools object if empty
          if (Object.keys(story.mcpTools).length === 0) {
            delete story.mcpTools;
          }
        }

        // Add missing acceptance criteria
        if (Array.isArray(story.acceptanceCriteria)) {
          const hasTypecheck = story.acceptanceCriteria.some(
            c => typeof c === 'string' && c.toLowerCase().includes('typecheck')
          );
          if (!hasTypecheck) {
            story.acceptanceCriteria.push('Typecheck passes');
            repairs.push(`${storyPrefix}.acceptanceCriteria: added "Typecheck passes"`);
            modified = true;
          }
        }

        // Ensure notes is a string
        if (story.notes === undefined) {
          story.notes = '';
          repairs.push(`${storyPrefix}: added empty notes field`);
          modified = true;
        }
      });

      // Reorder stories by priority
      const originalOrder = prd.userStories.map(s => s.id);
      prd.userStories.sort((a, b) => (a.priority || 999) - (b.priority || 999));
      const newOrder = prd.userStories.map(s => s.id);

      if (originalOrder.join(',') !== newOrder.join(',')) {
        repairs.push('Reordered stories by priority');
        modified = true;
      }
    }

    if (!modified) {
      return {
        success: true,
        repairs: [],
        message: 'No repairs needed'
      };
    }

    if (opts.dryRun) {
      return {
        success: true,
        repairs,
        message: 'Dry run - would apply repairs (use --force-repair to apply)'
      };
    }

    // Atomic write: write to temp file first
    tempFilePath = `${filePath}.tmp.${Date.now()}`;
    const updatedContent = JSON.stringify(prd, null, 2);

    // Write to temp file
    fs.writeFileSync(tempFilePath, updatedContent, 'utf-8');

    // Validate the temp file
    const tempValidation = validateSchema(tempFilePath, { availableMCPs });
    if (!tempValidation.valid) {
      fs.unlinkSync(tempFilePath);
      return {
        success: false,
        error: `Validation failed after repair:\n${tempValidation.errors.join('\n')}`
      };
    }

    // Atomic rename
    fs.renameSync(tempFilePath, filePath);
    tempFilePath = null;

    return {
      success: true,
      repairs
    };

  } catch (error) {
    // Clean up temp file on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Synchronize memory with related PRDs
 *
 * @param {string} filePath - Path to PRD JSON file
 * @param {object} options - Options {verbose: boolean, docsDir: string}
 * @returns {object} Result {success: boolean, syncResults: object[], error: string}
 */
function syncMemory(filePath, options = {}) {
  const opts = { verbose: false, docsDir: 'docs', ...options };
  const syncResults = [];

  try {
    // Read PRD
    const content = fs.readFileSync(filePath, 'utf-8');
    const prd = JSON.parse(content);

    if (!Array.isArray(prd.relatedPRDs) || prd.relatedPRDs.length === 0) {
      return {
        success: true,
        syncResults: [{ message: 'No related PRDs to sync' }]
      };
    }

    // Build dependency graph for circular dependency detection
    const visited = new Set();

    function hasCircularDependency(prdName, currentPath = []) {
      // Check if this PRD is already in the current path (circular dependency)
      if (currentPath.includes(prdName)) {
        return { circular: true, path: [...currentPath, prdName] };
      }
      // Skip if already checked in a previous branch
      if (visited.has(prdName)) {
        return { circular: false };
      }

      visited.add(prdName);
      const newPath = [...currentPath, prdName];

      // Read the related PRD
      const relatedPath = path.join(opts.docsDir, prdName);
      if (!fs.existsSync(relatedPath)) {
        return { circular: false };
      }

      try {
        const relatedContent = fs.readFileSync(relatedPath, 'utf-8');
        const relatedPRD = JSON.parse(relatedContent);

        if (Array.isArray(relatedPRD.relatedPRDs)) {
          for (const rel of relatedPRD.relatedPRDs) {
            if (rel.type === 'depends_on') {
              const result = hasCircularDependency(rel.prd, newPath);
              if (result.circular) {
                return result;
              }
            }
          }
        }
      } catch (e) {
        // Skip invalid PRDs
      }

      return { circular: false };
    }

    // Check each related PRD
    for (const related of prd.relatedPRDs) {
      const relatedPath = path.join(opts.docsDir, related.prd);

      // Check if related PRD exists
      if (!fs.existsSync(relatedPath)) {
        syncResults.push({
          prd: related.prd,
          status: 'warning',
          message: `Related PRD not found: ${related.prd}`
        });
        continue;
      }

      // Update status based on actual PRD state
      try {
        const relatedContent = fs.readFileSync(relatedPath, 'utf-8');
        const relatedPRDData = JSON.parse(relatedContent);

        // Check if all stories pass
        const allComplete = Array.isArray(relatedPRDData.userStories) &&
          relatedPRDData.userStories.every(s => s.passes === true);

        const actualStatus = allComplete ? 'complete' : 'incomplete';
        if (related.status !== actualStatus) {
          syncResults.push({
            prd: related.prd,
            status: 'updated',
            message: `Status updated: ${related.status} -> ${actualStatus}`
          });
          related.status = actualStatus;
        } else {
          syncResults.push({
            prd: related.prd,
            status: 'verified',
            message: `Status verified: ${actualStatus}`
          });
        }

        // Check for circular dependencies
        // Get the current PRD filename to check if we circle back to it
        const currentPrdName = path.basename(filePath);
        const circularCheck = hasCircularDependency(related.prd, [currentPrdName]);
        if (circularCheck.circular) {
          syncResults.push({
            prd: related.prd,
            status: 'warning',
            message: `Circular dependency detected: ${circularCheck.path.join(' -> ')}`
          });
        }
      } catch (parseError) {
        syncResults.push({
          prd: related.prd,
          status: 'error',
          message: `Failed to parse: ${parseError.message}`
        });
      }
    }

    // Check if current PRD should have memorial file
    const allStoriesComplete = Array.isArray(prd.userStories) &&
      prd.userStories.every(s => s.passes === true);

    const memorialPath = path.join(opts.docsDir, `memory-${prd.project || 'feature'}.md`);

    if (allStoriesComplete) {
      if (!fs.existsSync(memorialPath)) {
        syncResults.push({
          status: 'warning',
          message: `All stories complete but memorial file missing: ${memorialPath}`
        });
      } else if (!prd.consolidatedMemory || prd.consolidatedMemory.trim() === '') {
        syncResults.push({
          status: 'warning',
          message: 'All stories complete but consolidatedMemory field is empty'
        });
      }
    }

    return {
      success: true,
      syncResults
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// =============================================================================
// Export all functions
// =============================================================================

module.exports = {
  updatePRD,
  markStoryPassed,
  updateStoryNotes,
  validatePRD,
  createBackup,
  rollback,
  listBackups,
  restoreBackup,
  // New functions
  discoverMCPs,
  validateSchema,
  repairPRD,
  syncMemory,
  BACKUP_DIR,
  MAX_BACKUPS
};

// Allow running as a script for testing
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('PRD Utilities - Safe JSON Update with Rollback');
    console.log('');
    console.log('Usage:');
    console.log('  node prd-utils.js <prd-file> <command> [args]');
    console.log('');
    console.log('Commands:');
    console.log('  validate              - Validate PRD structure');
    console.log('  mark-passed <story-id> - Mark story as passed');
    console.log('  list-backups          - List all backups');
    console.log('  restore <backup-file>  - Restore from backup');
    console.log('');
    process.exit(0);
  }

  const [prdFile, command, ...cmdArgs] = args;

  switch (command) {
    case 'validate': {
      const content = fs.readFileSync(prdFile, 'utf-8');
      const prd = JSON.parse(content);
      const result = validatePRD(prd);
      if (result.valid) {
        console.log('✅ PRD is valid');
        process.exit(0);
      } else {
        console.log('❌ PRD validation failed:');
        result.errors.forEach(e => console.log(`  - ${e}`));
        process.exit(1);
      }
    }

    case 'mark-passed': {
      const storyId = cmdArgs[0];
      const result = markStoryPassed(prdFile, storyId);
      if (result.success) {
        console.log(`✅ Marked ${storyId} as passed`);
        console.log(`   Backup: ${result.backupPath}`);
      } else {
        console.log(`❌ Failed: ${result.error}`);
        process.exit(1);
      }
      break;
    }

    case 'list-backups': {
      const backups = listBackups(prdFile);
      if (backups.length === 0) {
        console.log('No backups found');
      } else {
        console.log(`Backups for ${prdFile}:`);
        backups.forEach(b => {
          console.log(`  ${b.filename} (${b.timestamp})`);
        });
      }
      break;
    }

    case 'restore': {
      const backupFile = cmdArgs[0];
      const result = restoreBackup(prdFile, backupFile);
      if (result.success) {
        console.log(`✅ Restored from ${backupFile}`);
      } else {
        console.log(`❌ Failed: ${result.error}`);
        process.exit(1);
      }
      break;
    }

    default:
      console.log(`Unknown command: ${command}`);
      process.exit(1);
  }
}
