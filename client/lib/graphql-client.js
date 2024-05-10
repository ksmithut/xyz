import { z } from 'zod'

const graphqlResultSchema = z.object({
  data: z.object({}).passthrough().nullable(),
  errors: z.array(z.object({ message: z.string() })).optional()
})

/**
 * @typedef {object} GraphqlResult
 * @property {any} data
 * @property {any[]} [errors]
 */

/**
 * @template {import('zod').AnyZodObject} TResultSchema
 * @template {import('zod').AnyZodObject} TVariablesSchema
 * @param {URL | RequestInfo} input
 * @param {RequestInit|undefined} init
 * @param {object} params
 * @param {string} params.query
 * @param {Record<string, any>} [params.variables]
 * @param {string} [params.operation]
 * @param {TResultSchema} params.resultSchema
 * @param {TVariablesSchema} params.variablesSchema
 * @returns {Promise<z.infer<TResultSchema>>}>}
 */
async function fetchGraphql(
  input,
  init,
  { query, variables, operation, resultSchema, variablesSchema }
) {
  variables = variablesSchema.parse(variables)
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(input, {
    method: 'POST',
    ...init,
    headers,
    body: init?.body || JSON.stringify({ query, variables, operation }),
    credentials: 'same-origin'
  })
  if (!res.ok) {
    throw new Error(`GraphqQL response failed with status: ${res.status}`)
  }
  const body = await res.json()
  const { data, errors } = graphqlResultSchema.parse(body)
  const result = {
    data: resultSchema.parse(data),
    errors
  }
  if (result.errors?.length) throw new GraphqlError(result)
  return result.data
}

class GraphqlError extends Error {
  /**
   * @param {z.infer<typeof graphqlResultSchema>} result
   */
  constructor(result) {
    if (!result.errors) throw new Error('Error throwing Graphql Error')
    const message = result.errors?.map((error) => error.message).join(', ')
    super(`GraphQL Error: ${message}`)
    Error.captureStackTrace(this, this.constructor)
    this.code = 'GRAPHQL_ERROR'
    this.data = result.data
    this.errors = result.errors
  }
}

/**
 * @param {URL | RequestInfo} input
 * @param {RequestInit} [init]
 */
export function createGraphqlClient(input, init) {
  const fetch = fetchGraphql.bind(null, input, init)
  return {
    /**
     * @template {import('zod').AnyZodObject} TResultSchema
     * @template {import('zod').AnyZodObject} TVariablesSchema
     * @param {string} query
     * @param {TResultSchema} resultSchema
     * @param {TVariablesSchema} variablesSchema
     * @returns {(variables: z.infer<TVariablesSchema>, operation?: string) => Promise<z.infer<TResultSchema>>}>}
     */
    createQuery(query, resultSchema, variablesSchema) {
      return (variables, operation) =>
        fetch({ variables, operation, query, resultSchema, variablesSchema })
    }
  }
}
