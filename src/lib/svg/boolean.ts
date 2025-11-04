import type { SvgPolygon } from './types';

/**
 * unionPolygonsByColor (stub)
 * 
 * NOTE: For first iteration we avoid pulling heavy boolean libs.
 * This function currently returns input unchanged and attaches a warning upstream.
 * 
 * If later needed, integrate one of:
 * - martinez-polygon-clipping (union, difference) - robust but heavier
 * - clipper-lib (Clipper2 wasm is fast) - needs scaling and integer coords
 * - paper.js (boolean ops on paths) - larger footprint
 */
export function unionPolygonsByColor(polys: SvgPolygon[]): SvgPolygon[] {
  return polys;
}