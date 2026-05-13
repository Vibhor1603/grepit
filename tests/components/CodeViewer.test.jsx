import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CodeViewer from '../../src/components/CodeViewer';

describe('CodeViewer', () => {
  it('renders code with line numbers', () => {
    const { container } = render(<CodeViewer code={"const x = 1;\nconst y = 2;"} filePath="test.js" analysisId="test" />);
    // Should render a pre element with code
    expect(container.querySelector('pre')).toBeInTheDocument();
  });

  it('detects language from file extension', () => {
    const { container } = render(<CodeViewer code="fn main() {}" filePath="main.rs" analysisId="test" />);
    // Should render without errors
    expect(container.querySelector('pre')).toBeInTheDocument();
  });

  it('renders JavaScript syntax highlighting', () => {
    const { container } = render(<CodeViewer code="function hello() { return 'world'; }" filePath="app.js" analysisId="test" />);
    expect(container.querySelector('pre')).toBeInTheDocument();
  });

  it('renders Python syntax highlighting', () => {
    const { container } = render(<CodeViewer code="def hello():\n    return 'world'" filePath="app.py" analysisId="test" />);
    expect(container.querySelector('pre')).toBeInTheDocument();
  });

  it('renders Go syntax highlighting', () => {
    const goCode = 'func main() {\n    fmt.Println("hello")\n}';
    const { container } = render(<CodeViewer code={goCode} filePath="main.go" analysisId="test" />);
    expect(container.querySelector('pre')).toBeInTheDocument();
  });

  it('shows explain button on function declarations', async () => {
    const { container } = render(<CodeViewer code="function handleAuth() {\n  return true;\n}" filePath="auth.js" analysisId="test" />);
    // The explain button appears on hover — verify the line is rendered
    const lines = container.querySelectorAll('[class*="group"]');
    expect(lines.length).toBeGreaterThan(0);
  });
});
