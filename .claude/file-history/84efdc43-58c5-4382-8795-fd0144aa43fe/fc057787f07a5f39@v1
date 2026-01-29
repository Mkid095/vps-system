/**
 * Auth Tools for NextMavens MCP Server
 */

export class AuthTools {
  private apiKey: string;
  private authUrl: string;

  constructor(apiKey: string, authUrl: string) {
    this.apiKey = apiKey;
    this.authUrl = authUrl;
  }

  async signIn(args: any) {
    const { email, password } = args;

    try {
      const response = await fetch(`${this.authUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: data.error || 'Sign in failed' }, null, 2)
            }
          ],
          isError: true
        };
      }

      // Don't expose the full tokens
      const { accessToken, refreshToken, user } = data;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              user,
              accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null,
              refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : null
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

  async signUp(args: any) {
    const { email, password, name, tenantId } = args;

    try {
      const response = await fetch(`${this.authUrl}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          email,
          password,
          name,
          tenant_id: tenantId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: data.error || 'Sign up failed' }, null, 2)
            }
          ],
          isError: true
        };
      }

      const { accessToken, refreshToken, user } = data;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              user,
              accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null,
              refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : null
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
