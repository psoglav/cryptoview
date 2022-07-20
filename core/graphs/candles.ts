import { TLinearGraphOptions, TCandlesHistory } from '../../types'
import Graph from '..'

export class CandlesGraph extends Graph {
  private CHART_GREEN_CANDLE_COLOR = '#24a599'
  private CHART_RED_CANDLE_COLOR = '#ec544f'

  // private CHART_PRICE_SEGMENTS = 6
  private CHART_GRADIENT: CanvasGradient | undefined

  private GRAPH_LEFT = 0
  private GRAPH_RIGHT = this.width
  private GRAPH_TOP = 0
  private GRAPH_BOTTOM = this.height

  private pointerYPosIndex = 4
  private pointerIsVisible = false
  private panningIsActive = false
  private candlesSpace = 0
  private yZoomFactor = 1.2
  private isZoomingYAxis = false

  private mousePosition = { x: 0, y: 0 }

  private history: TCandlesHistory | undefined
  private graphData: TCandlesHistory | undefined
  private topHistoryPrice: [number, number] = [0, 0]
  private bottomHistoryPrice: [number, number] = [0, 0]

  constructor(
    container: HTMLElement | string,
    data?: TCandlesHistory,
    opts?: TLinearGraphOptions
  ) {
    super(container)

    if (data) this.loadHistory(data)

    if (opts) this.applyOptions(opts)
    this.draw()
  }

  applyOptions(opts: TLinearGraphOptions) {
    if (opts.graphFill) {
      let { gradientStart, gradientEnd } = opts.graphFill

      if (gradientStart && gradientEnd) {
        this.CHART_GRADIENT = this.graphContext.createLinearGradient(
          0,
          0,
          0,
          this.height
        )
        this.CHART_GRADIENT.addColorStop(0, gradientStart)
        this.CHART_GRADIENT.addColorStop(1, gradientEnd)
      }
    }
  }

  getTopHistoryPrice(): [number, number] {
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

    this.topHistoryPrice = [i, max]

    return this.topHistoryPrice
  }

  getBottomHistoryPrice(): [number, number] {
    let history = this.filterVisiblePoints(this.history!.map(({ low }) => low))

    let min = history[0]
    let i = 0

    history.forEach((p, ii) => {
      if (p < min) {
        min = p
        i = ii
      }
    })

    this.bottomHistoryPrice = [i, min]

    return this.bottomHistoryPrice
  }

  get floatingWidth() {
    return this.GRAPH_RIGHT - this.GRAPH_LEFT
  }

  mouseMoveHandler(e: MouseEvent) {
    this.mousePosition.x = e.clientX
    this.mousePosition.y = e.clientY

    if (this.panningIsActive) {
      this.moveGraph(e.movementX)
    }

    this.movePointer()
    this.draw()
    this.drawPricePointer()
  }

  mouseEnterHandler() {
    this.pointerIsVisible = true
  }

  mouseLeaveHandler() {
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
    let cs = this.candlesSpace
    let wd = e.wheelDeltaY
    if (wd < 0 && cs < 1.7) return
    if (wd > 0 && cs > 350) return

    this.zoomGraph(wd > 1 ? 1 : -1)
    this.movePointer()
    this.draw()
    this.drawPricePointer()
  }

  yAxisMouseMoveHandler(e?: MouseEvent): void {
    if (this.isZoomingYAxis && e?.movementY) {
      let f = this.yZoomFactor
      f += (e?.movementY / 300) * f
      this.yZoomFactor = f
      this.draw(true)
    }
  }

  yAxisMouseDownHandler(e?: MouseEvent): void {
    this.isZoomingYAxis = true
  }
  yAxisMouseUpHandler(e?: MouseEvent): void {
    this.isZoomingYAxis = false
  }

  zoomYAxis(side: number) {
    // in dev
    this.GRAPH_BOTTOM += (this.GRAPH_BOTTOM / 20) * side
    this.GRAPH_TOP -= (this.GRAPH_TOP / 20) * side
  }

  zoomGraph(side: number) {
    let mx = this.mousePosition.x
    let d = 20 / this.zoomSpeed

    this.GRAPH_RIGHT += ((this.GRAPH_RIGHT - mx) / d) * side
    this.GRAPH_LEFT += ((this.GRAPH_LEFT - mx) / d) * side

    this.clampXPanning()

    this.graphData = this.normalizeData()
  }

  moveGraph(movement: number) {
    if (this.GRAPH_RIGHT == this.width - 200 && movement < 0) return
    if (this.GRAPH_LEFT == 0 && movement > 0) return

    this.GRAPH_LEFT += movement
    this.GRAPH_RIGHT += movement

    this.clampXPanning()

    this.graphData = this.normalizeData()
  }

  clampXPanning() {
    if (this.GRAPH_LEFT > 0) this.GRAPH_LEFT = 0
    if (this.GRAPH_RIGHT < this.width - 200) this.GRAPH_RIGHT = this.width - 200
  }

  filterVisiblePoints(data: any[]) {
    return data.filter((_, i) => {
      let x: number = this.GRAPH_LEFT + (this.floatingWidth / data.length) * i
      return x > 0 && x < this.width
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

  draw(updateGraphData?: boolean) {
    this.graphContext.clearRect(0, 0, this.width, this.height)

    this.drawGraph(updateGraphData)
    this.drawPointer()

    this.drawYAxis()
    this.drawXAxis()
    this.mainDebug()
  }

  drawPointer() {
    if (!this.graphData?.length || !this.pointerIsVisible) return

    let ctx = this.graphContext
    let x = this.GRAPH_LEFT + this.candlesSpace * this.pointerYPosIndex
    let y = this.mousePosition.y

    ctx.strokeStyle = '#666'
    ctx.setLineDash([5, 4])

    ctx.beginPath()
    this.moveTo(x, 0, ctx)
    this.lineTo(x, this.height, ctx)
    this.moveTo(0, y - this.canvasRect.top, ctx)
    ctx.lineTo(this.width, y - this.canvasRect.top)
    ctx.stroke()
    ctx.closePath()

    ctx.setLineDash([])
  }

  drawPricePointer() {
    let ctx = this.yAxisContext
    let y = this.mousePosition.y - this.canvasRect.top

    let h = this.height
    let t = this.topHistoryPrice[1]
    let b = this.bottomHistoryPrice[1]

    let normalize = (y: number) => ((y - b) / (t - b)) * h
    let reverse = (y: number) => h - y

    let convert = (y: number) => reverse(normalize(y))

    let price = (y / h) * (b - t) + t

    ctx.beginPath()
    ctx.fillStyle = '#707588'
    this.rect(0, y - 10, this.getWidth(ctx), 20, ctx)
    ctx.fill()
    ctx.closePath()
    ctx.fillStyle = 'white'
    ctx.font = '11px Verdana'
    ctx.fillText(price.toFixed(2), 10, y + 5.5)
  }

  mainDebug() {}

  drawXAxis() {}

  drawYAxis() {
    let ctx = this.graphContext
    let yAxisCtx = this.yAxisContext

    yAxisCtx.clearRect(
      0,
      0,
      yAxisCtx.canvas.clientWidth,
      yAxisCtx.canvas.clientHeight
    )

    let segments = 20,
      h = this.height,
      w = this.width

    let t = this.topHistoryPrice[1]
    let b = this.bottomHistoryPrice[1]

    let r = 1,
      tr = 0,
      br = 0

    let round = (n: number) => Math.round(n / r) * r

    while (tr == br) {
      tr = round(t)
      br = round(b)
      if (tr == br) r += 10
    }

    let normalize = (y: number) => ((y - br) / (tr - br)) * h
    let reverse = (y: number) => h - y

    let convert = (y: number) => reverse(normalize(y))

    this.clear(yAxisCtx)
    ctx.beginPath()

    ctx.strokeStyle = '#7777aa33'

    tr = convert(tr)
    br = convert(br)

    let hh = Math.abs((tr - br) / 2)

    let k = Math.abs(this.yZoomFactor)

    tr = (tr - hh) / k + hh
    br = (br - hh) / k + hh

    let step = (tr - br) / segments

    while (step > -30) {
      segments -= segments / 5
      step = (tr - br) / segments
    }

    while (step < -80) {
      segments += segments / 5
      step = (tr - br) / segments
    }

    let segmentsOut = 0

    while (tr > segmentsOut * Math.abs(step)) {
      segmentsOut++
    }

    for (let i = segments + segmentsOut; i >= -segmentsOut; i--) {
      let y = i * step
      this.moveTo(0, y + br, ctx)
      this.lineTo(w, y + br, ctx)

      let fz = 11
      yAxisCtx.fillStyle = '#9999ccee'
      yAxisCtx.font = fz + 'px Verdana'
      let price = i * ((t - b) / segments)
      yAxisCtx.fillText(round(price + b).toFixed(2), 10, y + br - 2 + fz / 2)
    }

    ctx.stroke()
    ctx.closePath()
  }

  drawGraph(updateGraphData?: boolean) {
    if (updateGraphData) {
      this.graphData = this.normalizeData()
    }

    let data = this.graphData

    if (!data?.length) {
      this.log('no history')
      return
    }

    let ctx = this.graphContext

    this.moveTo(this.GRAPH_LEFT - 10, this.height, ctx)

    for (let i = 0; i < data.length; i++) {
      this.candlesSpace = this.floatingWidth! / data.length
      let x = this.GRAPH_LEFT + i * this.candlesSpace
      let halfCandle = this.candlesSpace / 4

      if (x > this.width + halfCandle) break
      else if (x < -halfCandle) continue

      let { close, open, low, high } = data[i]

      let candleColor =
        close > open
          ? this.CHART_RED_CANDLE_COLOR
          : this.CHART_GREEN_CANDLE_COLOR

      ctx.beginPath()

      this.lineTo(x, high, ctx)
      this.lineTo(x, low, ctx)

      ctx.strokeStyle = candleColor
      ctx.stroke()

      if (halfCandle > 1) {
        this.rect(
          x - this.candlesSpace / 4,
          open,
          this.candlesSpace / 2,
          close - open,
          ctx
        )

        ctx.fillStyle = candleColor
        ctx.fill()
      }

      ctx.closePath()
    }
  }

  loadHistory(data: TCandlesHistory) {
    this.history = data
    this.draw(true)
  }

  normalizeData() {
    let hist = this.history

    if (!hist?.length) return []

    let result = hist?.map((n) => ({ ...n }))
    let h = this.height

    let min = this.getBottomHistoryPrice()[1]
    let max = this.getTopHistoryPrice()[1]

    let normalize = (y: number) => ((y - min) / (max - min)) * h
    let reverse = (y: number) => h - y

    let convert = (y: number) => reverse(normalize(y))

    for (let i = 0; i < hist.length; i++) {
      result[i].close = convert(result[i].close)
      result[i].open = convert(result[i].open)
      result[i].high = convert(result[i].high)
      result[i].low = convert(result[i].low)
    }

    min = convert(min)
    max = convert(max)

    let hh = Math.abs((max - min) / 2)

    result = result.map((point) => {
      let p = Object.create(point)
      let k = Math.abs(this.yZoomFactor)
      p.close = (p.close - hh) / k + hh
      p.open = (p.open - hh) / k + hh
      p.high = (p.high - hh) / k + hh
      p.low = (p.low - hh) / k + hh
      return p
    })

    return result
  }
}
