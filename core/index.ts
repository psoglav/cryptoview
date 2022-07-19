import { TContainer } from '../types'

export default abstract class Graph {
  container: HTMLElement | undefined

  graphContext: CanvasRenderingContext2D
  yAxisContext: CanvasRenderingContext2D
  xAxisContext: CanvasRenderingContext2D

  zoomSpeed: number = 4
  pixelRatio: number = 0

  constructor(container: HTMLElement | string) {
    this.graphContext = document.createElement('canvas').getContext('2d')!
    this.yAxisContext = document.createElement('canvas').getContext('2d')!
    this.xAxisContext = document.createElement('canvas').getContext('2d')!

    this.pixelRatio = this.getPixelRatio(this.graphContext)
    this.graphContext.lineWidth = 1 * this.pixelRatio

    if (typeof container === 'string') {
      this.container = document.querySelector<HTMLElement>(container)!
    }

    if (!this.container) {
      this.error('no container is found')
      return
    } else {
      this.container.innerHTML = ''
      this.container.style.display = 'grid'
      this.container.style.grid = '1fr 28px / 1fr 70px'
    }

    this.createChartMarkup(this.container)
    this.bindMouseListeners()
    this.bindYAxisListeners()

    this.rescale(this.graphContext)
    this.rescale(this.yAxisContext)
    this.rescale(this.xAxisContext)
  }

  createGraph(container: TContainer) {
    let canvas = this.graphContext.canvas

    const preventDefault = function (e: Event) {
      e.preventDefault()
      e.stopPropagation()
    }

    canvas.oncontextmenu = preventDefault
    canvas.onwheel = preventDefault

    return canvas
  }

  createXAxis() {
    let canvas = this.xAxisContext.canvas
    let ctx = canvas.getContext('2d')!

    this.xAxisContext = ctx

    return canvas
  }

  createYAxis() {
    let canvas = this.yAxisContext.canvas
    let ctx = canvas.getContext('2d')!

    this.yAxisContext = ctx

    return canvas
  }

  createChartMarkup(container: TContainer) {
    let graphCanvas = this.createGraph(container)
    let yAxisCanvas = this.createYAxis()
    let xAxisCanvas = this.createXAxis()

    graphCanvas.style.gridArea = '1 / 1 / 2 / 2'
    graphCanvas.style.width = '100%'
    graphCanvas.style.height = '100%'

    xAxisCanvas.style.gridArea = '2 / 1 / 3 / 3'
    xAxisCanvas.style.width = '100%'
    xAxisCanvas.style.height = '28px'

    yAxisCanvas.style.gridArea = '1 / 2 / 2 / 3'
    yAxisCanvas.style.width = '70px'
    yAxisCanvas.style.height = '100%'

    let rect = this.container!.getBoundingClientRect()

    this.setSize(rect.width - 70, rect.height - 28)

    window.addEventListener('resize', () => {
      this.setSize(rect.width, rect.height)
    })

    this.container!.appendChild(graphCanvas)
    this.container!.appendChild(xAxisCanvas)
    this.container!.appendChild(yAxisCanvas)
  }

  abstract mouseMoveHandler(e?: MouseEvent): void
  abstract mouseLeaveHandler(e?: MouseEvent): void
  abstract mouseEnterHandler(e?: MouseEvent): void
  abstract mouseDownHandler(e?: MouseEvent): void
  abstract mouseUpHandler(e?: MouseEvent): void
  abstract wheelHandler(e?: WheelEvent): void

  abstract yAxisWheelHandler(e?: WheelEvent): void

  bindMouseListeners() {
    let canvas = this.graphContext.canvas
    canvas.addEventListener('mousemove', (e) => this.mouseMoveHandler(e))
    canvas.addEventListener('mouseleave', (e) => this.mouseLeaveHandler(e))
    canvas.addEventListener('mouseenter', (e) => this.mouseEnterHandler(e))
    canvas.addEventListener('mousedown', (e) => this.mouseDownHandler(e))
    canvas.addEventListener('mouseup', (e) => this.mouseUpHandler(e))
    canvas.addEventListener('wheel', (e) => this.wheelHandler(e))
  }

  bindYAxisListeners() {
    let canvas = this.yAxisContext.canvas
    // canvas.addEventListener('mousemove', (e) => this.mouseMoveHandler(e))
    // canvas.addEventListener('mousedown', (e) => this.mouseDownHandler(e))
    // canvas.addEventListener('mouseup', (e) => this.mouseUpHandler(e))
    canvas.addEventListener('wheel', (e) => this.yAxisWheelHandler(e))
  }

  get width() {
    return this.graphContext.canvas.clientWidth * this.pixelRatio
  }

  get height() {
    return this.graphContext.canvas.clientHeight * this.pixelRatio
  }

  get canvasRect() {
    return this.graphContext.canvas.getBoundingClientRect()
  }

  setSize(w: number, h: number) {
    let canvas = this.graphContext.canvas
    canvas.width = w
    canvas.height = h
  }

  rescale(ctx: CanvasRenderingContext2D) {
    var width = this.width * this.pixelRatio
    var height = this.height * this.pixelRatio
    if (width != ctx.canvas.width) ctx.canvas.width = width
    if (height != ctx.canvas.height) ctx.canvas.height = height

    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0)
  }

  getSharpPixel(pos: number, thickness: number = 1): number {
    if (thickness % 2 == 0) {
      return pos
    }
    return pos + this.pixelRatio / 2
  }

  getPixelRatio(context: any) {
    let dpr = window.devicePixelRatio || 1
    let bsr =
      context.webkitBackingStorePixelRatio ||
      context.mozBackingStorePixelRatio ||
      context.msBackingStorePixelRatio ||
      context.oBackingStorePixelRatio ||
      context.backingStorePixelRatio ||
      1

    return dpr / bsr
  }

  moveTo(x: number, y: number, ctx: CanvasRenderingContext2D) {
    ctx.moveTo(this.getSharpPixel(x), this.getSharpPixel(y))
  }

  lineTo(x: number, y: number, ctx: CanvasRenderingContext2D) {
    ctx.lineTo(this.getSharpPixel(x), this.getSharpPixel(y))
  }

  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    ctx: CanvasRenderingContext2D
  ) {
    let getPx = this.getSharpPixel.bind(this)
    ctx.rect(getPx(x), getPx(y), getPx(w), getPx(h))
  }

  clear() {
    this.graphContext.clearRect(0, 0, this.width, this.height)
  }

  error(msg: string) {
    throw new Error('CryptoView Error: ' + msg)
  }

  log(...msg: any) {
    console.log('CryptoView Log: ', ...msg)
  }

  debug(text: any, x: number, y: number) {
    this.graphContext.fillStyle = 'black'
    this.graphContext.font = '20px Arial'
    this.graphContext.fillText(text, x, y)
  }
}
