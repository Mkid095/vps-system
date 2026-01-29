/**
 * Storage Tools for NextMavens MCP Server
 */

export class StorageTools {
  private apiKey: string;
  private storageUrl: string;

  constructor(apiKey: string, storageUrl: string) {
    this.apiKey = apiKey;
    this.storageUrl = storageUrl;
  }

  async getFileInfo(args: any) {
    const { fileId } = args;

    try {
      const response = await fetch(`${this.storageUrl}/api/files/${fileId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        }
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: data.error || 'Failed to get file info' }, null, 2)
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              fileId,
              file: data.file
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message || 'Network error' }, null, 2)
          }
        ],
        isError: true
      };
    }
  }

  async getDownloadUrl(args: any) {
    const { fileId } = args;

    try {
      const response = await fetch(`${this.storageUrl}/api/files/${fileId}/download`, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        }
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: data.error || 'Failed to get download URL' }, null, 2)
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              fileId,
              downloadUrl: data.download_url,
              publicUrl: `${this.storageUrl}/api/files/${fileId}/download`
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message || 'Network error' }, null, 2)
          }
        ],
        isError: true
      };
    }
  }

  async listFiles(args: any) {
    const { tenantId, fileType, limit, offset } = args;

    try {
      const params = new URLSearchParams();

      if (tenantId) params.append('tenant_id', tenantId);
      if (fileType) params.append('file_type', fileType);
      if (limit) params.append('limit', String(limit));
      if (offset) params.append('offset', String(offset));

      const url = `${this.storageUrl}/api/files${params.toString() ? '?' + params.toString() : ''}`;

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        }
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: data.error || 'Failed to list files' }, null, 2)
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              total: data.total,
              files: data.files,
              count: data.files?.length || 0
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message || 'Network error' }, null, 2)
          }
        ],
        isError: true
      };
    }
  }
}
