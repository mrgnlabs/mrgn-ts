export async function getBearerToken() {
  // Check if token exists in sessionStorage
  const token = sessionStorage.getItem("jwtToken");
  if (token) {
    return token;
  }

  const response = await fetch("/api/pool/auth");
  if (response.ok) {
    const data = await response.json();
    const newToken = data.token;

    sessionStorage.setItem("jwtToken", newToken);

    return newToken;
  } else {
    throw new Error("Failed to retrieve Bearer token");
  }
}
