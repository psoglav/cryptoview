export type TLinearHistory = number[][]

export type TCandlesPoint = {
  close: number
  high: number
  low: number
  open: number
  time: number
  volumefrom: number
  volumeto: number
}

export type TCandlesHistory = TCandlesPoint[]

export type TLinearGraphData = number[]

export type TContainer = Element | string

export interface TLinearGraphOptions {
  graphStroke?: {
    width?: number
    hoverWidth?: number
    color?: string
  }
  graphFill?: {
    gradientStart?: string
    gradientEnd?: string
  }
}
