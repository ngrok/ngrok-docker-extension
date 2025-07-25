export interface StepOneConfig {
  binding: BindingType;
  url?: string;
  additionalOptions: AdditionalOptionsState;
}

export interface StepTwoConfig {
  trafficPolicy: string;
}

export interface AdditionalOptionsState {
  poolingEnabled: boolean;
  description: string;
  metadata: string;
}

export type BindingType = 'public' | 'internal' | 'kubernetes';

export interface ContainerInfo {
  imageName: string;
  containerName: string;
  containerID: string;
  targetPort: string;
}


