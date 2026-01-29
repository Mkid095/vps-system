# @nextmavens/mcp-server

Model Context Protocol (MCP) server for NextMavens platform - enables AI assistants (Claude, ChatGPT, etc.) to directly interact with your NextMavens backend.

## Features

- **Database Operations**: Query, insert, update, and delete data
- **Authentication**: Sign up and sign in users
- **Storage**: Get file info, download URLs, and list files
- **GraphQL**: Execute GraphQL queries and introspect schema

## Installation

```bash
npm install -g @nextmavens/mcp-server
```

## Configuration

Set your API key as an environment variable:

```bash
export NEXTMAVENS_API_KEY=nm_live_pk_your_key_here
```

Optional: Configure custom endpoints

```bash
export NEXTMAVENS_API_URL=https://api.nextmavens.cloud
export NEXTMAVENS_AUTH_URL=https://auth.nextmavens.cloud
export NEXTMAVENS_GRAPHQL_URL=https://graphql.nextmavens.cloud
export NEXTMAVENS_STORAGE_URL=https://telegram.nextmavens.cloud
```

## Usage with Claude Desktop

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "nextmavens": {
      "command": "node",
      "args": ["/path/to/nextmavens-mcp-server/dist/index.js"],
      "env": {
        "NEXTMAVENS_API_KEY": "nm_live_pk_your_key_here"
      }
    }
  }
}
```

## Usage with Continue.dev

Add to your Continue config (`~/.continue/config.json`):

```json
{
  "mcpServers": [
    {
      "name": "nextmavens",
      "command": "node",
      "args": ["/path/to/nextmavens-mcp-server/dist/index.js"],
      "env": {
        "NEXTMAVENS_API_KEY": "nm_live_pk_your_key_here"
      }
    }
  ]
}
```

## Available Tools

### Database Operations

#### `nextmavens_query`
Query data from a table.

```json
{
  "table": "users",
  "filters": [
    { "column": "tenant_id", "operator": "eq", "value": "tenant-uuid" },
    { "column": "created_at", "operator": "gte", "value": "2024-01-01" }
  ],
  "orderBy": { "column": "created_at", "ascending": false },
  "limit": 10
}
```

#### `nextmavens_insert`
Insert a new row.

```json
{
  "table": "posts",
  "data": {
    "title": "Hello World",
    "content": "My first post",
    "user_id": 123
  }
}
```

#### `nextmavens_update`
Update existing rows.

```json
{
  "table": "users",
  "data": { "name": "New Name" },
  "filters": [
    { "column": "id", "operator": "eq", "value": 123 }
  ]
}
```

#### `nextmavens_delete`
Delete rows.

```json
{
  "table": "posts",
  "filters": [
    { "column": "id", "operator": "eq", "value": 456 }
  ]
}
```

### Authentication

#### `nextmavens_signin`
Sign in a user.

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### `nextmavens_signup`
Sign up a new user.

```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "tenantId": "tenant-uuid"
}
```

### Storage

#### `nextmavens_file_info`
Get file information.

```json
{
  "fileId": "telegram-file-id"
}
```

#### `nextmavens_file_download_url`
Get a download URL.

```json
{
  "fileId": "telegram-file-id"
}
```

#### `nextmavens_list_files`
List files with filters.

```json
{
  "tenantId": "tenant-uuid",
  "fileType": "photo",
  "limit": 20
}
```

### GraphQL

#### `nextmavens_graphql`
Execute a GraphQL query.

```json
{
  "query": "query { users { id email name } }",
  "variables": {}
}
```

#### `nextmavens_graphql_introspect`
Get schema information for exploring available types and fields.

```json
{}
```

## Filter Operators

- `eq`: Equals
- `neq`: Not equals
- `gt`: Greater than
- `gte`: Greater than or equal
- `lt`: Less than
- `lte`: Less than or equal
- `like`: LIKE (case-sensitive)
- `ilike`: ILIKE (case-insensitive)
- `in`: IN array

## Example Conversations

### With Claude

**You**: "Show me all users created in the last 7 days"

**Claude**: [Uses nextmavens_query tool]

```json
{
  "table": "users",
  "filters": [
    { "column": "created_at", "operator": "gte", "value": "2024-01-20" }
  ],
  "orderBy": { "column": "created_at", "ascending": false }
}
```

**You**: "Create a new post for user 123"

**Claude**: [Uses nextmavens_insert tool]

```json
{
  "table": "posts",
  "data": {
    "title": "New Post",
    "content": "Post content",
    "user_id": 123
  }
}
```

### With ChatGPT

**You**: "What tables are available in my database?"

**ChatGPT**: [Uses nextmavens_graphql_introspect tool]

**You**: "Get the download URL for file abc123"

**ChatGPT**: [Uses nextmavens_file_download_url tool]

## Development

```bash
# Clone repository
git clone https://github.com/Mkid095/nextmavens-mcp-server.git
cd nextmavens-mcp-server

# Install dependencies
npm install

# Build
npm run build

# Run (for testing)
NEXTMAVENS_API_KEY=your_key npm start
```

## Security

- Always use public keys (`nm_live_pk_*`) for client-side operations
- Keep secret keys (`nm_live_sk_*`) secure and never expose them
- The MCP server logs errors to stderr for debugging

## License

MIT

## Links

- [NextMavens Developer Portal](https://portal.nextmavens.cloud)
- [JavaScript SDK](https://github.com/Mkid095/nextmavens-js)
- [Documentation](https://docs.nextmavens.cloud)
