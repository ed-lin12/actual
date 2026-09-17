import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { MortgagePayoffWidget } from '@actual-app/core/types/models';

type Meta = NonNullable<MortgagePayoffWidget['meta']>;

export function useMortgagePayoffMeta(
  savedMeta: MortgagePayoffWidget['meta'] | undefined,
  onMetaChange: (meta: MortgagePayoffWidget['meta']) => void,
) {
  const [pending, setPending] = useState<Meta>({});
  const meta = useMemo(
    () => ({ ...savedMeta, ...pending }),
    [savedMeta, pending],
  );
  const latestMeta = useRef(meta);
  const persist = useRef(onMetaChange);

  useLayoutEffect(() => {
    latestMeta.current = meta;
    persist.current = onMetaChange;
  }, [meta, onMetaChange]);

  useEffect(() => {
    const keys = Object.keys(pending) as Array<keyof Meta>;
    // An earlier save can arrive while later fields are still being saved.
    // Keep local edits until the query acknowledges the complete draft.
    if (
      keys.length > 0 &&
      keys.every(key => savedMeta?.[key] === pending[key])
    ) {
      setPending({});
    }
  }, [savedMeta, pending]);

  const updateMeta = useCallback((changes: Meta) => {
    const nextMeta = { ...latestMeta.current, ...changes };
    latestMeta.current = nextMeta;
    setPending(previous => ({ ...previous, ...changes }));
    persist.current(nextMeta);
  }, []);

  return [meta, updateMeta] as const;
}
