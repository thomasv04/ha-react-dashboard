import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SparkLine } from './SparkLine';

describe('SparkLine', () => {
  it('renders SVG with path', () => {
    const { container } = render(<SparkLine data={[10, 20, 15, 30, 25]} width={200} height={60} />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelector('path')).toBeTruthy();
  });

  it('returns null for insufficient data', () => {
    const { container } = render(<SparkLine data={[10]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders end dot', () => {
    const { container } = render(<SparkLine data={[10, 20]} />);
    expect(container.querySelector('circle')).toBeTruthy();
  });

  it('renders area path when showArea is true', () => {
    const { container } = render(<SparkLine data={[10, 20, 15]} showArea />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(2); // area + line
  });

  it('renders only line path when showArea is false', () => {
    const { container } = render(<SparkLine data={[10, 20, 15]} showArea={false} />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(1);
  });
});
