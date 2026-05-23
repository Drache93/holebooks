declare global {
	namespace App {
		interface Locals {
			app: import('$lib/server/app').default | null
		}
	}
}

export {}
