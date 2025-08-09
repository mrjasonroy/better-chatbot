# MCP Storage Modes

The MCP (Model Context Protocol) system supports three storage modes:

## 1. Database Mode (Default)
**Environment Variables:**
```env
FILE_BASED_MCP_CONFIG=false
MCP_DEFAULT_SERVERS_ENABLED=false
```

**Behavior:**
- All MCP servers stored in database
- Users can add/edit/delete servers via UI
- Best for standard deployments

## 2. File-Based Mode (Development)
**Environment Variables:**
```env
FILE_BASED_MCP_CONFIG=true
```

**Behavior:**
- All MCP servers loaded from `.mcp-config.json` file
- File changes watched and auto-reload
- UI shows servers but disables add/edit/delete
- Best for local development

## 3. Hybrid Mode (Enterprise)
**Environment Variables:**
```env
FILE_BASED_MCP_CONFIG=false
MCP_DEFAULT_SERVERS_ENABLED=true
```

**Behavior:**
- Default servers loaded from `.mcp-config.json` (read-only)
- Users can add additional servers via database
- Default servers show "Default" badge and cannot be deleted/edited
- Best for enterprise deployments with curated default tools

## Configuration Files

### .mcp-config.json Example
```json
{
  "playwright": {
    "command": "npx",
    "args": ["@playwright/mcp@latest"]
  },
  "filesystem": {
    "command": "npx", 
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
  },
  "remote-api": {
    "url": "https://api.example.com/mcp",
    "headers": {
      "Authorization": "Bearer your-token"
    }
  }
}
```

## Migration Path

To migrate from database-only to hybrid mode:
1. Set `MCP_DEFAULT_SERVERS_ENABLED=true`
2. Create `.mcp-config.json` with your default servers
3. Restart the application
4. Default servers will appear alongside existing user servers