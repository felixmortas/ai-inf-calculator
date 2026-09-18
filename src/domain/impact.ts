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
  readonly constants?: ImpactConstants;
}

export interface ImpactConstants {
  readonly batchSize: number; readonly gpuInstalledPerServer: number; readonly serverPowerWithoutGpuW: number;
  readonly gpuMemoryGb: number; readonly quantizationBits: number; readonly memoryOverhead: number;
  readonly energyAlpha: number; readonly energyBeta: number; readonly energyGamma: number;
  readonly latencyAlpha: number; readonly latencyBeta: number; readonly latencyGamma: number;
}

export interface ImpactResult {
  readonly energyWh: number;
  readonly carbonGco2e: number;
  readonly waterL: number;
}

export type ImpactCalculation =
  | { readonly ok: true; readonly impact: ImpactResult }
  | { readonly ok: false; readonly code: 'invalid-parameters' };

export const defaultImpactConstants: Readonly<ImpactConstants> = Object.freeze({ batchSize: 64, gpuInstalledPerServer: 8, serverPowerWithoutGpuW: 1200, gpuMemoryGb: 80, quantizationBits: 16, memoryOverhead: 1.2, energyAlpha: 1.17e-6, energyBeta: -1.12e-2, energyGamma: 4.05e-5, latencyAlpha: 6.78e-4, latencyBeta: 3.12e-4, latencyGamma: 1.94e-2 });

function valid(input: ImpactInput): boolean {
  const values = Object.values(input).filter((value): value is number => typeof value === 'number');
  const constants = input.constants ?? defaultImpactConstants;
  const positiveConstants = [constants.batchSize, constants.gpuInstalledPerServer, constants.serverPowerWithoutGpuW,
    constants.gpuMemoryGb, constants.quantizationBits, constants.memoryOverhead, constants.energyAlpha,
    constants.energyGamma, constants.latencyAlpha, constants.latencyBeta, constants.latencyGamma];
  return values.every((value) => Number.isFinite(value) && value >= 0)
    && Object.values(constants).every(Number.isFinite)
    && positiveConstants.every((value) => value > 0) && constants.energyBeta <= 0
    && input.totalParameters > 0
    && input.activatedParameters > 0
    && input.activatedParameters <= input.totalParameters
    && input.pue >= 1;
}

/** Calcul pur en Wh, gCO2e et L : aucun arrondi n'est appliqué ici. */
export function calculateImpact(input: ImpactInput): ImpactCalculation {
  if (!valid(input)) return { ok: false, code: 'invalid-parameters' };
  const c = input.constants ?? defaultImpactConstants;
  const memoryGb = c.memoryOverhead * input.totalParameters * c.quantizationBits / 8;
  const gpuCount = Math.ceil(memoryGb / c.gpuMemoryGb);
  const outputWhPerToken = c.energyAlpha * Math.exp(c.energyBeta * c.batchSize) * input.activatedParameters
    + c.energyGamma
    + (c.latencyAlpha * input.activatedParameters + c.latencyBeta * c.batchSize + c.latencyGamma)
      * (c.serverPowerWithoutGpuW / 3600) * (gpuCount / c.gpuInstalledPerServer) / c.batchSize;
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
