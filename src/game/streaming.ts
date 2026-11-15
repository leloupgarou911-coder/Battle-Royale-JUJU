export type StreamingTier = "economy" | "balanced" | "performance";

export interface NetworkInformationLike extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
}

export interface StreamingProfile {
  tier: StreamingTier;
  tileCacheSize: number;
  zoneCacheLimit: number;
  prefetchDepth: number;
}

export interface StreamingEnvironment {
  online: boolean;
  memory?: number;
  cores?: number;
  connection?: Pick<NetworkInformationLike, "effectiveType" | "downlink" | "saveData">;
}

export function detectStreamingProfile(environment: StreamingEnvironment): StreamingProfile {
  const memory = environment.memory ?? 4;
  const cores = environment.cores ?? 4;
  const connection = environment.connection;
  const slowConnection = connection?.saveData === true
    || ["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "")
    || (connection?.downlink !== undefined && connection.downlink < 1.5);
  if (!environment.online || slowConnection || memory <= 2 || cores <= 2) {
    return { tier: "economy", tileCacheSize: 48, zoneCacheLimit: 25, prefetchDepth: 1 };
  }
  if ((connection?.downlink ?? 0) >= 8 && memory >= 8 && cores >= 8) {
    return { tier: "performance", tileCacheSize: 256, zoneCacheLimit: 81, prefetchDepth: 3 };
  }
  return { tier: "balanced", tileCacheSize: 128, zoneCacheLimit: 49, prefetchDepth: 2 };
}
