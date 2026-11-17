import { env } from "./env.js"
import { buildServer } from "./server/index.js"
import { getStatus } from "./valhalla/index.js"

// Loop generation routes every candidate through Valhalla, so there is no
// useful degraded mode without it. Check once at boot to put the fix in the
// log, but keep serving `/health` so the failure is visible.
try {
  await getStatus()
} catch {
  console.warn(
    `Valhalla is not available at ${env.valhallaUrl}. Loop requests will fail until it is running.`
  )
  console.warn("Start the local graph with: pnpm valhalla:up")
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
