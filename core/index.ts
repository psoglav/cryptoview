import { TContainer } from '../types'

export default abstract class Graph {
  context: CanvasRenderingContext2D
  zoomSpeed = 4

  constructor(container: TContainer) {
    if (typeof container === 'string') {
      container = document.querySelector(container)!
    }

    if (!container) this.error('no container is found')

    let canvas = document.createElement('canvas')
    this.context = canvas.getContext('2d')!

    canvas.style.width = '100%'
    canvas.style.height = '100%'

    const preventDefault = function (e: Event) {
      e.preventDefault()
      e.stopPropagation()
    }

    canvas.oncontextmenu = preventDefault
    canvas.onwheel = preventDefault
    this.setSize(1200, 600)

    container.appendChild(canvas)

    this.bindMouseListeners()

    window.addEventListener('resize', () => {
      let rect = (container as Element).getBoundingClientRect()
      this.setSize(rect.width, rect.height)
    })
  }

  abstract mouseMoveHandler(e?: MouseEvent): void
  abstract mouseLeaveHandler(e?: MouseEvent): void
  abstract mouseEnterHandler(e?: MouseEvent): void
  abstract mouseDownHandler(e?: MouseEvent): void
  abstract mouseUpHandler(e?: MouseEvent): void
  abstract wheelHandler(e?: WheelEvent): void

  abstract draw(): void

  bindMouseListeners() {
    let canvas = this.context.canvas
    canvas.addEventListener('mousemove', (e) => this.mouseMoveHandler(e))
    canvas.addEventListener('mouseleave', (e) => this.mouseLeaveHandler(e))
    canvas.addEventListener('mouseenter', (e) => this.mouseEnterHandler(e))
    canvas.addEventListener('mousedown', (e) => this.mouseDownHandler(e))
    canvas.addEventListener('mouseup', (e) => this.mouseUpHandler(e))
    canvas.addEventListener('wheel', (e) => this.wheelHandler(e))
  }

  get WIDTH() {
    return this.context.canvas.width
  }

  get HEIGHT() {
    return this.context.canvas.height
  }

  get canvasRect() {
    return this.context.canvas.getBoundingClientRect()
  }

  setSize(w: number, h: number) {
    this.context.canvas.width = w
    this.context.canvas.height = h
  }

  clear() {
    this.context.clearRect(0, 0, this.WIDTH, this.HEIGHT)
  }

  error(msg: string) {
    throw new Error('CryptoView Error: ' + msg)
  }

  log(...msg: any) {
    console.log('CryptoView Log: ', ...msg)
  }

  debug(text: any, x: number, y: number) {
    this.context.fillStyle = 'white'
    this.context.font = '20px Arial'
    this.context.fillText(text, x, y)
  }
}
