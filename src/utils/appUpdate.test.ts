import { afterEach, describe, expect, it, vi } from 'vitest'
import { updateAndReload } from './appUpdate'

function mockServiceWorker(registration: unknown) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: vi.fn().mockResolvedValue(registration) },
  })
}

describe('updateAndReload', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'serviceWorker')
  })

  it('reloads even without a service worker', async () => {
    const reload = vi.fn()
    await updateAndReload(reload)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('checks for updates before reloading', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    mockServiceWorker({ update, installing: null, waiting: null })
    const reload = vi.fn()

    await updateAndReload(reload)

    expect(update).toHaveBeenCalledTimes(1)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('waits for a new worker to activate before reloading', async () => {
    const worker = new EventTarget() as EventTarget & { state: string }
    worker.state = 'installing'
    mockServiceWorker({
      update: vi.fn().mockResolvedValue(undefined),
      installing: worker,
      waiting: null,
    })
    const reload = vi.fn()

    const done = updateAndReload(reload)
    await Promise.resolve()
    await Promise.resolve()
    expect(reload).not.toHaveBeenCalled()

    worker.state = 'activated'
    worker.dispatchEvent(new Event('statechange'))
    await done

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('still reloads when the update check fails', async () => {
    mockServiceWorker({ update: vi.fn().mockRejectedValue(new Error('offline')) })
    const reload = vi.fn()

    await updateAndReload(reload)

    expect(reload).toHaveBeenCalledTimes(1)
  })
})
