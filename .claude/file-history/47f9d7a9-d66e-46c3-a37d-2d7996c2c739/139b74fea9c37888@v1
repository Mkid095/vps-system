#!/usr/bin/env node
/**
 * PRD to JSON Converter
 * Converts all PRD markdown files to JSON format for Maven Flow
 */

const fs = require('fs');
const path = require('path');

const docsDir = '/home/ken/docs';

// List of all PRD markdown files
const prdFiles = [
  'cli-tool',
  'background-jobs',
  'idempotency',
  'audit-logs',
  'quotas-limits',
  'environment-parity',
  'standardized-errors',
  'feature-flags',
  'migration-strategy',
  'provisioning-state-machine',
  'break-glass',
  'secrets-versioning',
  'observability',
  'deletion-preview',
  'mcp-governance',
  'organizations-teams',
  'rbac-system',
  'enhanced-api-keys',
  'project-lifecycle',
  'project-detail-pages',
  'auth-user-manager',
  'usage-tracking',
  'logs-viewer',
  'api-gateway-enforcement',
  'resource-isolation',
  'key-rotation',
  'abuse-controls',
  'webhooks-events',
  'backup-strategy',
  'support-escape-hatch',
  'sql-editor',
  'schema-browser',
  'collapsible-sidebar-docs',
  'sdk-documentation',
  'realtime-documentation',
  'platform-philosophy',
  'versioning-strategy',
  'infrastructure-docs',
  'failure-modes-docs'
];

function parsePRD(content, featureName) {
  const lines = content.split('\n');
  const stories = [];
  let currentStory = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match story headers like ### US-001: Title
    const storyMatch = line.match(/### US-(\d+): (.+)/);
    if (storyMatch) {
      if (currentStory) {
        stories.push(currentStory);
      }
      currentStory = {
        id: `US-${storyMatch[1]}`,
        title: storyMatch[2].trim(),
        description: '',
        acceptanceCriteria: [],
        mavenSteps: [],
        mcpTools: {},
        priority: 1,
        passes: false,
        notes: ''
      };
      continue;
    }

    if (!currentStory) continue;

    // Extract description (As a... format)
    const descMatch = line.match(/^As a (.+), I want (.+) so that (.+)\.$/);
    if (descMatch) {
      currentStory.description = `As a ${descMatch[1]}, I want ${descMatch[2]} so that ${descMatch[3]}.`;
      continue;
    }

    // Extract Priority
    const priorityMatch = line.match(/\*\*Priority:\*\* (\d+)/);
    if (priorityMatch) {
      currentStory.priority = parseInt(priorityMatch[1]);
      continue;
    }

    // Extract Maven Steps
    const stepsMatch = line.match(/\*\*Maven Steps:\*\* \[(.+)\]/);
    if (stepsMatch) {
      currentStory.mavenSteps = stepsMatch[1].split(',').map(s => parseInt(s.trim()));
      currentStory.mcpTools = {};
      currentStory.mavenSteps.forEach(step => {
        currentStory.mcpTools[`step${step}`] = [];
      });
      continue;
    }

    // Extract acceptance criteria (bulleted lines)
    if (line.startsWith('- ')) {
      const criterion = line.substring(2);
      if (criterion && !criterion.startsWith('**')) {
        currentStory.acceptanceCriteria.push(criterion);
      }
    }
  }

  if (currentStory) {
    stories.push(currentStory);
  }

  return stories;
}

function convertPRDToJSON(prdName) {
  const mdPath = path.join(docsDir, `prd-${prdName}.md`);
  const jsonPath = path.join(docsDir, `prd-${prdName}.json`);
  const progressPath = path.join(docsDir, `progress-${prdName}.txt`);

  // Check if markdown exists
  if (!fs.existsSync(mdPath)) {
    console.log(`Skipping ${prdName} - markdown not found`);
    return;
  }

  // Check if JSON already exists
  if (fs.existsSync(jsonPath)) {
    console.log(`Skipping ${prdName} - JSON already exists`);
    return;
  }

  console.log(`Converting ${prdName}...`);

  const content = fs.readFileSync(mdPath, 'utf8');

  // Extract project name and branch from frontmatter
  const projectMatch = content.match(/project: (.+)/);
  const branchMatch = content.match(/branch: (.+)/);
  const descriptionMatch = content.match(/## Overview\s*\n(.+?)(?:\n##|\n###|$)/s);

  const project = projectMatch ? projectMatch[1].trim() : 'NextMavens';
  const branchName = branchMatch ? branchMatch[1].trim() : `flow/${prdName}`;
  const description = descriptionMatch ? descriptionMatch[1].trim() : '';

  // Parse stories
  const userStories = parsePRD(content, prdName);

  if (userStories.length === 0) {
    console.log(`  Warning: No stories found in ${prdName}`);
    return;
  }

  // Create JSON
  const prdJSON = {
    project,
    branchName,
    description,
    userStories
  };

  fs.writeFileSync(jsonPath, JSON.stringify(prdJSON, null, 2));
  console.log(`  Created ${path.basename(jsonPath)} with ${userStories.length} stories`);

  // Create progress file
  const progressContent = `# ${prdName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - Progress Tracker

## Feature: ${prdName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
**Branch**: ${branchName}
**Start Date**: ${new Date().toISOString().split('T')[0]}
**Status**: Initialized

## User Stories (${userStories.length} total)

${userStories.map(s => `| ${s.id} | ${s.title} | ${s.priority} | Pending | |`).join('\n')}

## Progress Summary
- Total Stories: ${userStories.length}
- Completed: 0 (0%)
- In Progress: 0
- Pending: ${userStories.length}

## Iteration Log
`;

  fs.writeFileSync(progressPath, progressContent);
  console.log(`  Created ${path.basename(progressPath)}`);
}

// Convert all PRDs
console.log('Converting PRDs to JSON format...\n');
prdFiles.forEach(prdName => {
  try {
    convertPRDToJSON(prdName);
  } catch (error) {
    console.error(`Error converting ${prdName}:`, error.message);
  }
});

console.log('\nConversion complete!');
console.log(`\nSummary:`);
console.log(`- Processed ${prdFiles.length} PRDs`);
console.log(`- JSON files created in: ${docsDir}/`);
console.log(`- Progress files created in: ${docsDir}/`);
console.log(`\nNext step: Run /flow to begin implementation`);
