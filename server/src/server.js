import http from 'node:http'
import { createApp } from './app.js'
import { connectDatabase } from './config/database.js'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'

async function main() {
	await connectDatabase()
	const server = http.createServer(createApp())
	server.listen(env.port, () =>
		logger.info(`API listening on http://localhost:${env.port}`),
	)

	const shutdown = async () => {
		logger.info('Shutting down...')
		server.close(async () => process.exit(0))
	}
	process.on('SIGINT', shutdown)
	process.on('SIGTERM', shutdown)
}

main().catch((error) => {
	logger.error('Failed to start server:', error)
	process.exit(1)
})
