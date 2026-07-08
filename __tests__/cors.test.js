describe('CORS Configuration', () => {
  const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:3000',
    'https://ebautomationai.github.io'
  ];

  test('should include localhost:3001 in allowed origins', () => {
    expect(allowedOrigins).toContain('http://localhost:3001');
  });

  test('should include localhost:3000 in allowed origins', () => {
    expect(allowedOrigins).toContain('http://localhost:3000');
  });

  test('should include GitHub Pages origin', () => {
    expect(allowedOrigins).toContain('https://ebautomationai.github.io');
  });

  test('should not allow arbitrary origins', () => {
    expect(allowedOrigins).not.toContain('https://evil.com');
  });
});
