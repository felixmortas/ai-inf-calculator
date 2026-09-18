export interface ImpactInput {
  readonly newInputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
  readonly totalParameters: number;
  readonly activatedParameters: number;
  readonly inputRatio: number;
  readonly cacheRatio: number;
  readonly pue: number;
  readonly carbonIntensity: number;
  readonly wue: number;
}

export interface ImpactResult {
  readonly energyWh: number;
  readonly carbonGco2e: number;
  readonly waterL: number;
}

export type ImpactCalculation =
  | { readonly ok: true; readonly impact: ImpactResult }
  | { readonly ok: false; readonly code: 'invalid-parameters' };

const batchSize = 64;
const gpuInstalledPerServer = 8;
const serverPowerWithoutGpuW = 1200;
const gpuMemoryGb = 80;
const quantizationBits = 16;
const memoryOverhead = 1.2;
const energyAlpha = 1.17e-6;
const energyBeta = -1.12e-2;
const energyGamma = 4.05e-5;
const latencyAlpha = 6.78e-4;
const latencyBeta = 3.12e-4;
const latencyGamma = 1.94e-2;

function valid(input: ImpactInput): boolean {
  const values = Object.values(input);
  return values.every((value) => Number.isFinite(value) && value >= 0)
    && input.totalParameters > 0
    && input.activatedParameters > 0
    && input.activatedParameters <= input.totalParameters
    && input.pue >= 1;
}

/** Calcul pur en Wh, gCO2e et L : aucun arrondi n'est appliqué ici. */
export function calculateImpact(input: ImpactInput): ImpactCalculation {
  if (!valid(input)) return { ok: false, code: 'invalid-parameters' };
  const memoryGb = memoryOverhead * input.totalParameters * quantizationBits / 8;
  const gpuCount = Math.ceil(memoryGb / gpuMemoryGb);
  const outputWhPerToken = energyAlpha * Math.exp(energyBeta * batchSize) * input.activatedParameters
    + energyGamma
    + (latencyAlpha * input.activatedParameters + latencyBeta * batchSize + latencyGamma)
      * (serverPowerWithoutGpuW / 3600) * (gpuCount / gpuInstalledPerServer) / batchSize;
  const inputWhPerToken = input.inputRatio * outputWhPerToken;
  const cacheWhPerToken = input.cacheRatio * inputWhPerToken;
  const energyWh = (input.newInputTokens * inputWhPerToken
    + input.cachedInputTokens * cacheWhPerToken + input.outputTokens * outputWhPerToken) * input.pue;
  const carbonGco2e = energyWh / 1000 * input.carbonIntensity;
  const waterL = energyWh / 1000 * input.wue;
  if (![energyWh, carbonGco2e, waterL].every((value) => Number.isFinite(value) && value >= 0)) {
    return { ok: false, code: 'invalid-parameters' };
  }
  return { ok: true, impact: Object.freeze({ energyWh, carbonGco2e, waterL }) };
}
