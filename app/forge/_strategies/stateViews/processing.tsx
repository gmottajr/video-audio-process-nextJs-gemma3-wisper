import type { StateViewStrategy } from "./types";

// The PROCESSING state renders no content in the animated content area —
// all processing feedback is shown via fixed overlays (outside contentRef).
const processing: StateViewStrategy = {
  state: "PROCESSING",
  render() {
    return null;
  },
};

export default processing;
