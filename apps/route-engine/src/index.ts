import { env } from "./env.js"
import { buildServer } from "./server.js"

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
