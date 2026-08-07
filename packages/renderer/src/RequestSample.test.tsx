import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { generateRequestSample, RequestSample } from './RequestSample';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const request = {
  method: 'POST',
  url: 'https://api.example.com/companies',
  headers: ['Authorization: Bearer token', 'Content-Type: application/json'],
  body: '{"name":"Acme"}',
};

describe('RequestSample', () => {
  it('generates samples for every offered language', () => {
    expect(generateRequestSample('curl', request)).toContain('curl --request POST');
    expect(generateRequestSample('javascript', request)).toContain('await fetch');
    expect(generateRequestSample('node', request)).toContain('response.ok');
    expect(generateRequestSample('python', request)).toContain('requests.post');
    expect(generateRequestSample('java', request)).toContain('HttpRequest.newBuilder');
    expect(generateRequestSample('csharp', request)).toContain('HttpRequestMessage');
    expect(generateRequestSample('php', request)).toContain('GuzzleHttp');
    expect(generateRequestSample('go', request)).toContain('http.NewRequest');
  });

  it('switches language and persists the choice', () => {
    const { unmount } = render(<RequestSample request={request} storageKey="test-language" />);
    fireEvent.click(screen.getByRole('option', { name: 'Python' }));
    expect(screen.getByText(/requests\.post/)).toBeInTheDocument();
    expect(window.localStorage.getItem('test-language')).toBe('"python"');

    unmount();
    render(<RequestSample request={request} storageKey="test-language" />);
    expect(screen.getByRole('option', { name: /Python/ })).toHaveAttribute('aria-selected', 'true');
  });
});
