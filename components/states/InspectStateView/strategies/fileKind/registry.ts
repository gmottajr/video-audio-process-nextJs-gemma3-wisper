import type { FileKindStrategy } from "./types";
import type { FileKind } from "../../types";
import { audioFileKind } from "./audio";
import { videoFileKind } from "./video";
import { unknownFileKind } from "./unknown";

const strategies: FileKindStrategy[] = [videoFileKind, audioFileKind, unknownFileKind];

export function getFileKindStrategy(file: File): FileKindStrategy {
  return strategies.find((s) => s.detect(file)) ?? unknownFileKind;
}

export function detectKind(file: File): FileKind {
  return getFileKindStrategy(file).kind;
}

export { strategies as fileKindStrategies };
