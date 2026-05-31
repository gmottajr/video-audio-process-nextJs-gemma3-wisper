export const DOWNLOAD_STATE_KEY = 'mediaforge_model_download_state';

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface DownloadState {
  modelId: string;
  startedAt: number;
  progress: number;
  totalMB: number;
  completed: boolean;
}

export function readResumeState(): DownloadState | null {
  try {
    const raw = localStorage.getItem(DOWNLOAD_STATE_KEY);
    if (!raw) return null;
    const state: DownloadState = JSON.parse(raw);
    const isRecent = Date.now() - state.startedAt < MAX_AGE_MS;
    if (!state.completed && isRecent && state.progress > 0 && state.progress < 100) {
      return state;
    }
    if (state.completed) localStorage.removeItem(DOWNLOAD_STATE_KEY);
    return null;
  } catch {
    return null;
  }
}

export function saveDownloadProgress(
  modelId: string,
  progress: number,
  totalMB: number
): void {
  try {
    const state: DownloadState = {
      modelId,
      startedAt: Date.now(),
      progress,
      totalMB,
      completed: false,
    };
    localStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable
  }
}

export function markDownloadComplete(modelId: string, totalMB: number): void {
  try {
    const state: DownloadState = {
      modelId,
      startedAt: Date.now(),
      progress: 100,
      totalMB,
      completed: true,
    };
    localStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable
  }
}

export function clearDownloadState(): void {
  try {
    localStorage.removeItem(DOWNLOAD_STATE_KEY);
  } catch {
    // localStorage unavailable
  }
}
