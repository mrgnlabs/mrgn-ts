import { getPointsSummary, STATUS_NOT_FOUND, STATUS_OK } from "../lib";

// export const fetchUserPoints = async (userAddress?: string) => {
//   const response = await getUserPoints(userAddress);
//   return response;
// };

export const fetchPointsSummary = async () => {
  const response = await getPointsSummary();
  return response;
};

export const fetchUser = async (userAddress: string) => {
  const response = await fetch("/api/user/get", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ wallet: userAddress }),
  });

  if (response.status === STATUS_OK) {
    // User found
    const { user } = await response.json();
    return user;
  } else if (response.status === STATUS_NOT_FOUND) {
    // User not found
    return undefined;
  } else {
    // Error
    const { error } = await response.json();
    throw new Error(`Failed to fetch user: ${error}`);
  }
};
