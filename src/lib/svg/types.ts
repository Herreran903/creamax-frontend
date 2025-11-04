export type Vec2 = [number, number];

export interface SvgPolygon {
  outer: Vec2[];
  holes?: Vec2[][];
}

export interface SvgColorGroup {
  hex: string; // normalized hex #RRGGBB
  opacity?: number; // 0..1 if provided by SVG fill-opacity
  shapes: SvgPolygon[];
}

export interface SvgProcessResult {
  width: number;
  height: number;
  viewBox?: [number, number, number, number];
  colors: SvgColorGroup[];
  warnings?: string[];
}

export type DepthMap = Record<string, number>;

export type SvgWorkerProgressStep =
  | 'parse'
  | 'group'
  | 'simplify'
  | 'boolean'
  | 'done';

export type SvgWorkerMessage =
  | {
      type: 'progress';
      step: SvgWorkerProgressStep;
      progress: number; // 0..100
      note?: string;
    }
  | {
      type: 'error';
      error: string;
    }
  | {
      type: 'result';
      result: SvgProcessResult;
    };