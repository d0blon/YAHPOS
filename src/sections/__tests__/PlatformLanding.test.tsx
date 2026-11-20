import { fireEvent, render } from '@testing-library/react'
import PlatformLanding from '@/sections/PlatformLanding'
import gsap from '@/lib/gsap'

jest.mock('@/lib/gsap', () => {
  const timeline = {
    from: jest.fn(),
  }
  timeline.from.mockReturnValue(timeline)

  return {
    __esModule: true,
    default: {
      timeline: jest.fn(() => timeline),
      to: jest.fn(),
      from: jest.fn(),
    },
  }
})

jest.mock('@gsap/react', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')

  type ContextSafe = <T extends (...args: never[]) => unknown>(handler: T) => T
  type UseGsapCallback = (
    context: unknown,
    contextSafe: ContextSafe,
  ) => (() => void) | void

  return {
    useGSAP: (callback: UseGsapCallback): void => {
      ReactModule.useEffect(() => {
        const contextSafe: ContextSafe = (handler) => handler
        const cleanup = callback({}, contextSafe)
        return typeof cleanup === 'function' ? cleanup : undefined
      }, [])
    },
  }
})

const gsapToMock = gsap.to as jest.Mock

describe('PlatformLanding magnetic buttons', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('animates on mouse events and removes listeners on unmount', () => {
    const addEventListenerSpy = jest.spyOn(HTMLElement.prototype, 'addEventListener')
    const removeEventListenerSpy = jest.spyOn(HTMLElement.prototype, 'removeEventListener')

    const { unmount } = render(<PlatformLanding />)
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('.magnetic-btn'))

    expect(buttons).toHaveLength(4)

    buttons.forEach((button) => {
      jest.spyOn(button, 'getBoundingClientRect').mockReturnValue({
        x: 100,
        y: 50,
        left: 100,
        top: 50,
        right: 300,
        bottom: 150,
        width: 200,
        height: 100,
        toJSON: () => ({
          x: 100,
          y: 50,
          left: 100,
          top: 50,
          right: 300,
          bottom: 150,
          width: 200,
          height: 100,
        }),
      })
    })

    gsapToMock.mockClear()

    fireEvent.mouseMove(buttons[0], { clientX: 260, clientY: 120 })

    expect(gsapToMock).toHaveBeenCalledWith(buttons[0], {
      x: 24,
      y: 8,
      duration: 0.6,
      ease: 'power3.out',
    })

    fireEvent.mouseLeave(buttons[0])

    expect(gsapToMock).toHaveBeenCalledWith(buttons[0], {
      x: 0,
      y: 0,
      duration: 0.8,
      ease: 'elastic.out(1, 0.3)',
    })

    const magneticAddCalls = addEventListenerSpy.mock.calls
      .map((args, index) => ({
        args,
        target: addEventListenerSpy.mock.contexts[index] as HTMLElement | undefined,
      }))
      .filter(({ target }) => target !== undefined && buttons.includes(target))

    const moveListeners = magneticAddCalls
      .filter(({ args }) => args[0] === 'mousemove')
      .map(({ args }) => args[1])
    const leaveListeners = magneticAddCalls
      .filter(({ args }) => args[0] === 'mouseleave')
      .map(({ args }) => args[1])

    expect(moveListeners).toHaveLength(buttons.length)
    expect(leaveListeners).toHaveLength(buttons.length)

    unmount()

    const magneticRemoveCalls = removeEventListenerSpy.mock.calls
      .map((args, index) => ({
        args,
        target: removeEventListenerSpy.mock.contexts[index] as HTMLElement | undefined,
      }))
      .filter(({ target }) => target !== undefined && buttons.includes(target))

    const removedMoveListeners = magneticRemoveCalls
      .filter(({ args }) => args[0] === 'mousemove')
      .map(({ args }) => args[1])
    const removedLeaveListeners = magneticRemoveCalls
      .filter(({ args }) => args[0] === 'mouseleave')
      .map(({ args }) => args[1])

    moveListeners.forEach((listener) => {
      expect(removedMoveListeners).toContain(listener)
    })
    leaveListeners.forEach((listener) => {
      expect(removedLeaveListeners).toContain(listener)
    })

    gsapToMock.mockClear()
    fireEvent.mouseMove(buttons[0], { clientX: 260, clientY: 120 })
    fireEvent.mouseLeave(buttons[0])
    expect(gsapToMock).not.toHaveBeenCalled()
  })
})
