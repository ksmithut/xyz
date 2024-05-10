const textDecoder = new TextDecoder()

/**
 * @param {Response} res
 */
export async function* streamResponse(res) {
  if (!res.body) return
  const reader = res.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    yield textDecoder.decode(value)
  }
}
