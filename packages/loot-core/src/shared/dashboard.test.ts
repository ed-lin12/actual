import { describe, expect, it } from 'vitest';

import { DEFAULT_DASHBOARD_STATE } from './dashboard';

describe('default mortgage widget layout', () => {
  it('does not overlap other default widgets', () => {
    const mortgage = DEFAULT_DASHBOARD_STATE.find(
      widget => widget.type === 'mortgage-payoff-card',
    );
    expect(mortgage).toBeDefined();
    if (!mortgage) {
      return;
    }

    for (const widget of DEFAULT_DASHBOARD_STATE) {
      if (widget === mortgage) {
        continue;
      }
      const overlaps =
        (widget.x ?? 0) < (mortgage.x ?? 0) + mortgage.width &&
        (widget.x ?? 0) + widget.width > (mortgage.x ?? 0) &&
        (widget.y ?? 0) < (mortgage.y ?? 0) + mortgage.height &&
        (widget.y ?? 0) + widget.height > (mortgage.y ?? 0);
      expect(overlaps, `${widget.type} overlaps the mortgage card`).toBe(false);
    }
  });
});
