export async function authDemo(pin: string): Promise<Response> {
  return fetch('/api/auth/demo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pincode: pin }),
    credentials: 'include',
  });
} 