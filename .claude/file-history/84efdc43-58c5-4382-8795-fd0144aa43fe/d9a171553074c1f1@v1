#!/usr/bin/env node
/**
 * NextMavens MCP Server
 * Model Context Protocol server for AI/IDE integration with NextMavens platform
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import { DatabaseTools } from './tools/database.js';
import { AuthTools } from './tools/auth.js';
import { StorageTools } from './tools/storage.js';
import { GraphQLTools } from './tools/graphql.js';

// Get API key from environment
const API_KEY = process.env.NEXTMAVENS_API_KEY || process.env.NEXTMAVENS_PUBLIC_KEY;
const API_URL = process.env.NEXTMAVENS_API_URL || 'https://api.nextmavens.cloud';
const AUTH_URL = process.env.NEXTMAVENS_AUTH_URL || 'https://auth.nextmavens.cloud';
const GRAPHQL_URL = process.env.NEXTMAVENS_GRAPHQL_URL || 'https://graphql.nextmavens.cloud';
const STORAGE_URL = process.env.NEXTMAVENS_STORAGE_URL || 'https://telegram.nextmavens.cloud';

// Validate configuration
if (!API_KEY) {
  console.error('Error: NEXTMAVENS_API_KEY environment variable is required');
  console.error('Set it with: export NEXTMAVENS_API_KEY=nm_live_pk_your_key_here');
  process.exit(1);
}

// Create server
const server = new Server(
  {
    name: 'nextmavens-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Initialize tool handlers
const dbTools = new DatabaseTools(API_KEY, API_URL);
const authTools = new AuthTools(API_KEY, AUTH_URL);
const storageTools = new StorageTools(API_KEY, STORAGE_URL);
const graphqlTools = new GraphQLTools(API_KEY, GRAPHQL_URL);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Database tools
      {
        name: 'nextmavens_query',
        description: 'Execute a database query on NextMavens. Supports SELECT operations with filters.',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name to query'
            },
            filters: {
              type: 'array',
              description: 'Array of filters to apply',
              items: {
                type: 'object',
                properties: {
                  column: { type: 'string' },
                  operator: {
                    type: 'string',
                    enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in']
                  },
                  value: {}
                }
              }
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results'
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip'
            },
            orderBy: {
              type: 'object',
              properties: {
                column: { type: 'string' },
                ascending: { type: 'boolean' }
              }
            }
          },
          required: ['table']
        }
      },
      {
        name: 'nextmavens_insert',
        description: 'Insert a row into a database table',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name to insert into'
            },
            data: {
              type: 'object',
              description: 'Data to insert (key-value pairs)'
            }
          },
          required: ['table', 'data']
        }
      },
      {
        name: 'nextmavens_update',
        description: 'Update rows in a database table',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name to update'
            },
            data: {
              type: 'object',
              description: 'Data to update (key-value pairs)'
            },
            filters: {
              type: 'array',
              description: 'Filters to identify rows to update',
              items: {
                type: 'object',
                properties: {
                  column: { type: 'string' },
                  operator: { type: 'string' },
                  value: {}
                }
              }
            }
          },
          required: ['table', 'data', 'filters']
        }
      },
      {
        name: 'nextmavens_delete',
        description: 'Delete rows from a database table',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name to delete from'
            },
            filters: {
              type: 'array',
              description: 'Filters to identify rows to delete',
              items: {
                type: 'object',
                properties: {
                  column: { type: 'string' },
                  operator: { type: 'string' },
                  value: {}
                }
              }
            }
          },
          required: ['table', 'filters']
        }
      },
      // Auth tools
      {
        name: 'nextmavens_signin',
        description: 'Sign in a user with email and password',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'User email'
            },
            password: {
              type: 'string',
              description: 'User password'
            }
          },
          required: ['email', 'password']
        }
      },
      {
        name: 'nextmavens_signup',
        description: 'Sign up a new user',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'User email'
            },
            password: {
              type: 'string',
              description: 'User password'
            },
            name: {
              type: 'string',
              description: 'User display name'
            },
            tenantId: {
              type: 'string',
              description: 'Tenant ID for multi-tenancy'
            }
          },
          required: ['email', 'password']
        }
      },
      // Storage tools
      {
        name: 'nextmavens_file_info',
        description: 'Get information about a file by ID',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: {
              type: 'string',
              description: 'File ID from Telegram storage'
            }
          },
          required: ['fileId']
        }
      },
      {
        name: 'nextmavens_file_download_url',
        description: 'Get a download URL for a file',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: {
              type: 'string',
              description: 'File ID from Telegram storage'
            }
          },
          required: ['fileId']
        }
      },
      {
        name: 'nextmavens_list_files',
        description: 'List files with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            tenantId: {
              type: 'string',
              description: 'Filter by tenant ID'
            },
            fileType: {
              type: 'string',
              description: 'Filter by file type'
            },
            limit: {
              type: 'number',
              description: 'Maximum results'
            },
            offset: {
              type: 'number',
              description: 'Results offset'
            }
          }
        }
      },
      // GraphQL tools
      {
        name: 'nextmavens_graphql',
        description: 'Execute a GraphQL query',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'GraphQL query'
            },
            variables: {
              type: 'object',
              description: 'GraphQL variables'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'nextmavens_graphql_introspect',
        description: 'Get GraphQL schema introspection for exploring available types and fields',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Database operations
      case 'nextmavens_query':
        return await dbTools.query(args);

      case 'nextmavens_insert':
        return await dbTools.insert(args);

      case 'nextmavens_update':
        return await dbTools.update(args);

      case 'nextmavens_delete':
        return await dbTools.delete(args);

      // Auth operations
      case 'nextmavens_signin':
        return await authTools.signIn(args);

      case 'nextmavens_signup':
        return await authTools.signUp(args);

      // Storage operations
      case 'nextmavens_file_info':
        return await storageTools.getFileInfo(args);

      case 'nextmavens_file_download_url':
        return await storageTools.getDownloadUrl(args);

      case 'nextmavens_list_files':
        return await storageTools.listFiles(args);

      // GraphQL operations
      case 'nextmavens_graphql':
        return await graphqlTools.query(args);

      case 'nextmavens_graphql_introspect':
        return await graphqlTools.introspect(args);

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing ${name}: ${error.message || error}`
    );
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('NextMavens MCP Server running');
  console.error('Connected to:', API_URL);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
