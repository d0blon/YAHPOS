import { fireEvent, render } from '@testing-library/react'
import gsap from 'gsap'
import Magnetic from '@/components/ui/magnetic'

jest.mock('gsap', () => {
  const quickTo = jest.fn(() => jest.fn())
  return {
    __esModule: true,
    default: { quickTo },
  }
})

const quickToMock = jest.mocked(gsap.quickTo)

describe('Magnetic cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('removes the exact listeners it attached to the cloned child on unmount', () => {
    const addSpy = jest.spyOn(HTMLElement.prototype, 'addEventListener')
    const removeSpy = jest.spyOn(HTMLElement.prototype, 'removeEventListener')

    const { getByRole, unmount } = render(
      <Magnetic>
        <button type="button">Target</button>
      </Magnetic>
    )
    const node = getByRole('button', { name: 'Target' })

    const addedOnNode = addSpy.mock.calls
      .map((args, index) => ({ args, target: addSpy.mock.contexts[index] as HTMLElement | undefined }))
      .filter(({ target }) => target === node)
    const moveHandler = addedOnNode.find(({ args }) => args[0] === 'mousemove')?.args[1]
    const leaveHandler = addedOnNode.find(({ args }) => args[0] === 'mouseleave')?.args[1]

    expect(moveHandler).toBeDefined()
    expect(leaveHandler).toBeDefined()
    expect(quickToMock).toHaveBeenCalledWith(node, 'x', expect.objectContaining({ duration: 1 }))
    expect(quickToMock).toHaveBeenCalledWith(node, 'y', expect.objectContaining({ duration: 1 }))

    unmount()

    const removedOnNode = removeSpy.mock.calls
      .map((args, index) => ({ args, target: removeSpy.mock.contexts[index] as HTMLElement | undefined }))
      .filter(({ target }) => target === node)

    expect(removedOnNode).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ args: ['mousemove', moveHandler] }),
        expect.objectContaining({ args: ['mouseleave', leaveHandler] }),
      ])
    )

    const before = quickToMock.mock.results.length
    fireEvent.mouseMove(node, { clientX: 10, clientY: 10 })
    fireEvent.mouseLeave(node)
    expect(quickToMock.mock.results).toHaveLength(before)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
