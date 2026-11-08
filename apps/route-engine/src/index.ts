import { env } from "./env.js"
import { buildServer } from "./server/index.js"
import { getStatus } from "./valhalla/index.js"

// Prefer the configured instance. If it is down and a fallback exists, switch
// once at boot rather than making every route request try the dead endpoint.
if (env.valhallaFallbackUrl) {
  try {
    await getStatus()
  } catch {
    console.warn(
      `Valhalla at ${env.valhallaUrl} is unreachable; using ${env.valhallaFallbackUrl}`
    )
    env.valhallaUrl = env.valhallaFallbackUrl
  }
}

const app = buildServer()

const server = app.listen(env.port, env.host, () => {
  console.log(`Route engine listening on http://${env.host}:${env.port}`)
  console.log(`Valhalla at ${env.valhallaUrl}`)
})

server.on("error", (error) => {
  console.error(`Route engine could not start: ${error.message}`)
  process.exit(1)
})

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
  })
}
