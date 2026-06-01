import type { ComponentType } from "react";

export interface LandingSectionStrategy {
  id: string;
  key: string;
  Component: ComponentType;
}
