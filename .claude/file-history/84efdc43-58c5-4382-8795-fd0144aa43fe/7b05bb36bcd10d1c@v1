/**
 * Database Tools for NextMavens MCP Server
 */

export class DatabaseTools {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  private buildUrl(table: string, filters: any[] = [], limit?: number, offset?: number, orderBy?: any): string {
    let url = `${this.apiUrl}/${table}`;
    const params: string[] = [];

    // Build filters
    filters.forEach((f: any) => {
      const value = typeof f.value === 'object' ? JSON.stringify(f.value) : String(f.value);

      switch (f.operator) {
        case 'eq':
          params.push(`${f.column}=${encodeURIComponent(value)}`);
          break;
        case 'neq':
          params.push(`${f.column}.neq=${encodeURIComponent(value)}`);
          break;
        case 'gt':
          params.push(`${f.column}.gt=${encodeURIComponent(value)}`);
          break;
        case 'gte':
          params.push(`${f.column}.gte=${encodeURIComponent(value)}`);
          break;
        case 'lt':
          params.push(`${f.column}.lt=${encodeURIComponent(value)}`);
          break;
        case 'lte':
          params.push(`${f.column}.lte=${encodeURIComponent(value)}`);
          break;
        case 'like':
          params.push(`${f.column}.like=${encodeURIComponent(value)}`);
          break;
        case 'ilike':
          params.push(`${f.column}.ilike=${encodeURIComponent(value)}`);
          break;
        case 'in':
          params.push(`${f.column}.in=${encodeURIComponent(value)}`);
          break;
      }
    });

    // Add ordering
    if (orderBy) {
      const order = orderBy.ascending ? 'asc' : 'desc';
      params.push(`order=${orderBy.column}.${order}`);
    }

    // Add pagination
    if (limit) params.push(`limit=${limit}`);
    if (offset) params.push(`offset=${offset}`);

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return url;
  }

  async query(args: any) {
    const { table, filters = [], limit, offset, orderBy } = args;

    try {
      const url = this.buildUrl(table, filters, limit, offset, orderBy);

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
              text: JSON.stringify({ error: data.message || data.error || 'Query failed' }, null, 2)
            }
          ],
          isError: true
        };
      }

      // Handle different response formats
      const results = Array.isArray(data) ? data : (data.data || data.results || data);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              table,
              count: results.length,
              data: results
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

  async insert(args: any) {
    const { table, data } = args;

    try {
      const response = await fetch(`${this.apiUrl}/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: result.message || result.error || 'Insert failed' }, null, 2)
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
              success: true,
              table,
              data: result.data || result
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

  async update(args: any) {
    const { table, data, filters } = args;

    try {
      const url = this.buildUrl(table, filters);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: result.message || result.error || 'Update failed' }, null, 2)
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
              success: true,
              table,
              data: result.data || result
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

  async delete(args: any) {
    const { table, filters } = args;

    try {
      const url = this.buildUrl(table, filters);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        }
      });

      if (!response.ok) {
        const result = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: result.message || result.error || 'Delete failed' }, null, 2)
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
              success: true,
              table,
              message: 'Rows deleted successfully'
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
