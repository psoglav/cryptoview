import { TContainer, TLinearGraphOptions, TCandlesHistory } from '../../types'
import Graph from '..'

export class CandlesGraph extends Graph {
  private CHART_HOVER_STROKE_WIDTH = 1.5
  private CHART_CURRENT_STROKE_WIDTH = this.CHART_HOVER_STROKE_WIDTH
  private CHART_STROKE_WIDTH = 1
  private CHART_GREEN_CANDLE_COLOR = '#24a599'
  private CHART_RED_CANDLE_COLOR = '#ec544f'

  // private CHART_PRICE_SEGMENTS = 6
  private CHART_GRADIENT: CanvasGradient | undefined

  private GRAPH_LEFT = 0
  private GRAPH_RIGHT = this.WIDTH

  private pointerYPosIndex = 4
  private pointerIsVisible = false
  private panningIsActive = false
  private candlesSpace = 0

  private mousePosition = { x: 0, y: 0 }

  private history: TCandlesHistory | undefined
  private graphData: TCandlesHistory | undefined

  constructor(
    container: TContainer,
    data?: TCandlesHistory,
    opts?: TLinearGraphOptions
  ) {
    super(container)

    if (data) this.loadHistory(data)

    if (opts) this.applyOptions(opts)
    this.draw()
  }

  applyOptions(opts: TLinearGraphOptions) {
    if (opts.graphStroke) {
      let { width, hoverWidth } = opts.graphStroke

      if (hoverWidth) this.CHART_HOVER_STROKE_WIDTH = hoverWidth
      if (width) {
        this.CHART_STROKE_WIDTH = width
        this.CHART_CURRENT_STROKE_WIDTH = width
      }
    }

    if (opts.graphFill) {
      let { gradientStart, gradientEnd } = opts.graphFill

      if (gradientStart && gradientEnd) {
        this.CHART_GRADIENT = this.context.createLinearGradient(
          0,
          0,
          0,
          this.HEIGHT
        )
        this.CHART_GRADIENT.addColorStop(0, gradientStart)
        this.CHART_GRADIENT.addColorStop(1, gradientEnd)
      }
    }
  }

  get graphDataWithPadding() {
    // let hh = this.topHistoryPrice[1] - this.bottomHistoryPrice[1]

    return this.graphData?.map((point) => {
      let p = Object.create(point)
      // p.close = (p.close - hh) / 1.5 + hh
      // p.open = (p.open - hh) / 1.5 + hh
      // p.high = (p.high - hh) / 1.5 + hh
      // p.low = (p.low - hh) / 1.5 + hh
      return p
    })
  }

  get topHistoryPrice() {
    let history = this.filterVisiblePoints(
      this.history!.map(({ high }) => high)
    )

    let max = history[0]
    let i = 0

    history.forEach((p, ii) => {
      if (p > max) {
        max = p
        i = ii
      }
    })

    return [i, max]
  }

  get bottomHistoryPrice() {
    let history = this.filterVisiblePoints(this.history!.map(({ low }) => low))

    let min = history[0]
    let i = 0

    history.forEach((p, ii) => {
      if (p < min) {
        min = p
        i = ii
      }
    })

    return [i, min]
  }

  get floatingWidth() {
    return this.GRAPH_RIGHT - this.GRAPH_LEFT
  }

  normalizeToGraphY(value: number) {
    let max = this.topHistoryPrice[1]
    let min = this.bottomHistoryPrice[1]

    let h = this.HEIGHT
    let y = h - ((value - min) / (max - min)) * (h || 1)

    return (y - h / 2) / 1.5 + h / 2
  }

  mouseMoveHandler(e: MouseEvent) {
    this.CHART_CURRENT_STROKE_WIDTH = this.CHART_HOVER_STROKE_WIDTH
    this.mousePosition.x = e.clientX
    this.mousePosition.y = e.clientY

    if (this.panningIsActive) {
      this.moveGraph(e.movementX)
    }

    this.movePointer()
    this.draw()
  }

  mouseEnterHandler() {
    this.pointerIsVisible = true
  }

  mouseLeaveHandler() {
    this.CHART_CURRENT_STROKE_WIDTH = this.CHART_STROKE_WIDTH
    this.pointerIsVisible = false
    this.panningIsActive = false

    this.draw()
  }

  mouseDownHandler(e: MouseEvent) {
    if (e.button == 0) {
      e.preventDefault()
      this.panningIsActive = true
    }
  }

  mouseUpHandler(e: MouseEvent) {
    if (e.button == 0) {
      this.panningIsActive = false
    }
  }

  wheelHandler(e: any) {
    this.zoomGraph(e.wheelDeltaY > 1 ? 1 : -1)
    this.movePointer()
    this.draw()
  }

  draw(updateGraphData?: boolean) {
    this.context.clearRect(0, 0, this.WIDTH, this.HEIGHT)

    // this.drawGrid(this.CHART_PRICE_SEGMENTS)
    this.drawGraph(updateGraphData)
    this.drawPointer()
  }

  zoomGraph(side: number) {
    let mx = this.mousePosition.x
    let d = 20 / this.zoomSpeed

    this.GRAPH_RIGHT += ((this.GRAPH_RIGHT - mx) / d) * side
    this.GRAPH_LEFT += ((this.GRAPH_LEFT - mx) / d) * side

    this.clampGraph()

    this.graphData = this.normalizeData()
  }

  moveGraph(movement: number) {
    if (this.GRAPH_RIGHT == this.WIDTH - 200 && movement < 0) return
    if (this.GRAPH_LEFT == 0 && movement > 0) return

    this.GRAPH_LEFT += movement
    this.GRAPH_RIGHT += movement

    this.clampGraph()

    this.graphData = this.normalizeData()
  }

  clampGraph() {
    if (this.GRAPH_LEFT > 0) this.GRAPH_LEFT = 0
    if (this.GRAPH_RIGHT < this.WIDTH - 200) this.GRAPH_RIGHT = this.WIDTH - 200
  }

  filterVisiblePoints(data: any[]) {
    return data.filter((_, i) => {
      let x: number = this.GRAPH_LEFT + (this.floatingWidth / data.length) * i

      return x > 0 && x < 1200
    })
  }

  movePointer() {
    let data = this.graphData

    if (!data?.length) return

    let x = this.mousePosition.x - this.canvasRect.x
    x = ((x - this.GRAPH_LEFT) / this.floatingWidth) * data.length

    let i = Math.round(x)

    this.pointerYPosIndex =
      i > data.length - 1 ? data.length - 1 : i < 0 ? 0 : i
  }

  drawPointer() {
    if (!this.graphData?.length || !this.pointerIsVisible) return

    let ctx = this.context
    let history = this.graphData
    let x =
      this.GRAPH_LEFT +
      (this.floatingWidth / history.length) * this.pointerYPosIndex
    let y = this.mousePosition.y

    let prevLineWidth = ctx.lineWidth
    ctx.lineWidth = 0.5
    ctx.strokeStyle = '#666'
    ctx.setLineDash([5, 4])

    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, this.HEIGHT)
    ctx.stroke()
    ctx.closePath()

    ctx.beginPath()
    ctx.moveTo(0, y - this.canvasRect.top)
    ctx.lineTo(this.WIDTH, y - this.canvasRect.top)
    ctx.stroke()
    ctx.closePath()

    ctx.setLineDash([])
    ctx.lineWidth = prevLineWidth
  }

  drawGraph(updateGraphData?: boolean) {
    if (updateGraphData) {
      this.graphData = this.normalizeData()
    }

    let data = this.graphDataWithPadding || []

    if (!data.length) {
      this.log('no history')
      return
    }

    let ctx = this.context

    ctx.lineWidth = this.CHART_CURRENT_STROKE_WIDTH || this.CHART_STROKE_WIDTH

    ctx.moveTo(this.GRAPH_LEFT - 10, this.HEIGHT)

    for (let i = 0; i < data.length; i++) {
      this.candlesSpace = this.floatingWidth! / data.length
      let x = this.GRAPH_LEFT + i * this.candlesSpace
      let halfCandle = this.candlesSpace / 4

      if (x > this.WIDTH + halfCandle) break
      else if (x < -halfCandle) continue

      let { close, open, low, high } = data[i]

      let color =
        close > open
          ? this.CHART_RED_CANDLE_COLOR
          : this.CHART_GREEN_CANDLE_COLOR

      ctx.beginPath()

      ctx.lineTo(x, high)
      ctx.lineTo(x, low)

      ctx.strokeStyle = color
      ctx.stroke()

      ctx.rect(
        x - this.candlesSpace / 4,
        open,
        this.candlesSpace / 2,
        close - open
      )

      ctx.fillStyle = color
      ctx.fill()

      ctx.closePath()
    }

    // ctx.fillStyle = this.CHART_GRADIENT || ''

    ctx.fill()
  }

  drawGrid(segments: number) {
    let ctx = this.context

    let top, bottom

    top = this.topHistoryPrice[1]
    bottom = this.bottomHistoryPrice[1]

    top = Math.round(top / 1000) * 1000
    bottom = Math.round(bottom / 1000) * 1000

    let interval = (bottom - top) / segments

    ctx.strokeStyle = '#ffffff22'
    ctx.strokeRect(0, 0, this.WIDTH, this.HEIGHT)

    ctx.beginPath()

    for (let i = -1; i <= segments + 1; i++) {
      let y = i * interval + top

      ctx.fillStyle = '#ffffff44'
      ctx.fillText(y.toString(), this.WIDTH - 35, this.normalizeToGraphY(y) - 5)

      y = this.normalizeToGraphY(y)

      ctx.moveTo(0, y)
      ctx.lineTo(this.WIDTH, y)
    }

    ctx.strokeStyle = '#ffffff33'
    let prevLineWidth = ctx.lineWidth
    ctx.lineWidth = 0.5
    ctx.stroke()
    ctx.lineWidth = prevLineWidth
    ctx.closePath()
  }

  loadHistory(data: TCandlesHistory) {
    this.history = data
    this.draw(true)
  }

  normalizeData() {
    let hist = this.history

    if (!hist?.length) return []

    let h = this.HEIGHT
    let result = hist?.map((n) => ({ ...n }))

    let min = this.bottomHistoryPrice[1]
    let max = this.topHistoryPrice[1]
    let normalize = (y: number) => h - ((y - min) / (max - min)) * h

    for (let i = 0; i < hist.length; i++) {
      result[i].close = normalize(result[i].close)
      result[i].open = normalize(result[i].open)
      result[i].high = normalize(result[i].high)
      result[i].low = normalize(result[i].low)
    }

    min = normalize(min)
    max = normalize(max)
    let hh = Math.abs((max - min) / 2)

    result = result.map((point) => {
      let p = Object.create(point)
      let k = 2
      p.close = (p.close - hh) / k + hh
      p.open = (p.open - hh) / k + hh
      p.high = (p.high - hh) / k + hh
      p.low = (p.low - hh) / k + hh
      return p
    })

    return result
  }
}
