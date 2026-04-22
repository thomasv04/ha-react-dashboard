import { useRef, useEffect, useState } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  const [prev, setPrev] = useState<T | undefined>(undefined);
  useEffect(() => {
    setPrev(ref.current);
    ref.current = value;
  });
  return prev;
}
