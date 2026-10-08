const ACTIVATION_TIMEOUT_MS = 5000

function waitForActivation(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve) => {
    if (worker.state === 'activated') return resolve()
    const timeout = setTimeout(resolve, ACTIVATION_TIMEOUT_MS)
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated' || worker.state === 'redundant') {
        clearTimeout(timeout)
        resolve()
      }
    })
  })
}

/**
 * Asks the service worker to check for a new version, waits for it to take over
 * and reloads the page. Data lives in localStorage, so nothing is lost.
 */
export async function updateAndReload(reload: () => void = () => window.location.reload()) {
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration) {
      await registration.update()
      const newWorker = registration.installing ?? registration.waiting
      if (newWorker) await waitForActivation(newWorker)
    }
  } catch {
    // Offline or no service worker: a plain reload is still useful.
  }
  reload()
}
