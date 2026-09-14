import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
// jsdom не реализует прокрутку; layout/scroll проверяются настоящим браузером.
vi.stubGlobal('scrollTo', vi.fn());
