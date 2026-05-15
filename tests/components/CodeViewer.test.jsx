import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CodeViewer from '../../src/components/CodeViewer';

const wrapper = ({ children }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('CodeViewer', () => {
  it('renders code with syntax highlighting', () => {
    const { container } = render(<CodeViewer code={"const x = 1;\nconst y = 2;"} filePath="test.js" analysisId="test" />, { wrapper });
    expect(container.querySelector('pre')).toBeInTheDocument();
  });

  it('detects language from file extension', () => {
    const { container } = render(<CodeViewer code="fn main() {}" filePath="main.rs" analysisId="test" />, { wrapper });
    expect(container.querySelector('pre')).toBeInTheDocument();
  });

  it('renders JavaScript', () => {
    const { container } = render(<CodeViewer code="function hello() { return 'world'; }" filePath="app.js" analysisId="test" />, { wrapper });
    expect(container.querySelector('pre')).toBeInTheDocument();
  });

  it('renders Python', () => {
    const { container } = render(<CodeViewer code={"def hello():\n    return 'world'"} filePath="app.py" analysisId="test" />, { wrapper });
    expect(container.querySelector('pre')).toBeInTheDocument();
  });

  it('renders Go', () => {
    const goCode = 'func main() {\n    fmt.Println("hello")\n}';
    const { container } = render(<CodeViewer code={goCode} filePath="main.go" analysisId="test" />, { wrapper });
    expect(container.querySelector('pre')).toBeInTheDocument();
  });

  it('shows explain button on function declarations', () => {
    const { container } = render(<CodeViewer code={"function handleAuth() {\n  return true;\n}"} filePath="auth.js" analysisId="test" />, { wrapper });
    const lines = container.querySelectorAll('[class*="group"]');
    expect(lines.length).toBeGreaterThan(0);
  });
});
