/**
 * GraphQL Tools for NextMavens MCP Server
 */

export class GraphQLTools {
  private apiKey: string;
  private graphqlUrl: string;

  constructor(apiKey: string, graphqlUrl: string) {
    this.apiKey = apiKey;
    this.graphqlUrl = graphqlUrl;
  }

  async query(args: any) {
    const { query, variables = {} } = args;

    try {
      const response = await fetch(this.graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({ query, variables })
      });

      const data = await response.json();

      if (!response.ok || data.errors) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: data.errors?.[0]?.message || 'GraphQL query failed',
                errors: data.errors
              }, null, 2)
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
              data: data.data
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

  async introspect(args: any) {
    const introspectionQuery = `
      {
        __schema {
          types {
            name
            kind
            description
            fields {
              name
              type {
                name
                kind
                ofType {
                  name
                  kind
                }
              }
            }
          }
          queryType {
            name
            fields {
              name
              description
              type {
                name
                kind
                ofType {
                  name
                  kind
                }
              }
              args {
                name
                type {
                  name
                  kind
                  ofType {
                    name
                    kind
                  }
                }
              }
            }
          }
          mutationType {
            name
            fields {
              name
              description
              type {
                name
                kind
              }
              args {
                name
                type {
                  name
                  kind
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(this.graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({ query: introspectionQuery })
      });

      const data = await response.json();

      if (!response.ok || data.errors) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: data.errors?.[0]?.message || 'Introspection failed',
                errors: data.errors
              }, null, 2)
            }
          ],
          isError: true
        };
      }

      const schema = data.data.__schema;

      // Format for better readability
      const queryFields = schema.queryType?.fields?.map((f: any) => ({
        name: f.name,
        description: f.description,
        returnType: f.type?.name || f.type?.ofType?.name
      })) || [];

      const mutationFields = schema.mutationType?.fields?.map((f: any) => ({
        name: f.name,
        description: f.description,
        returnType: f.type?.name
      })) || [];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              schema: {
                queryType: {
                  name: schema.queryType?.name,
                  fieldCount: queryFields.length,
                  fields: queryFields
                },
                mutationType: schema.mutationType ? {
                  name: schema.mutationType.name,
                  fieldCount: mutationFields.length,
                  fields: mutationFields
                } : null
              }
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
