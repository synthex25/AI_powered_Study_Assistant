export const normalizeBaseUrl = (url: string) => {
  const trimmed = url.replace(/\/+$/, '');
  // Accept both ".../api" and ".../api/" in env vars; callers append "/api".
  return trimmed.replace(/\/api$/i, '');
};

