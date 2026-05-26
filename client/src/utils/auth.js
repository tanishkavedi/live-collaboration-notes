// Decode JWT payload without verifying signature
function parseToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

// Returns true if token exists and is not expired
export function isTokenValid() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  const payload = parseToken(token);
  if (!payload || !payload.exp) return false;
  // exp is in seconds, Date.now() is in ms
  return payload.exp * 1000 > Date.now();
}

// Clear session and redirect to login
export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('name');
}

// Wrap any fetch call — if 401, clear session and redirect
export async function authFetch(url, options = {}, navigate) {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`
    }
  });
  if (res.status === 401) {
    clearSession();
    if (navigate) navigate('/login');
    throw new Error('Session expired');
  }
  return res;
}