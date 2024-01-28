export const useConvertkit = () => {
  const addSubscriber = async (
    formId: string,
    email: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> => {
    const url = `https://api.convertkit.com/v3/forms/${formId}/subscribe`;
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
    };
    const body = JSON.stringify({
      api_key: process.env.NEXT_PUBLIC_CONVERT_KIT_API_KEY,
      email: email,
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        return {
          success: false,
          error: data.message,
        };
      }

      return {
        success: true,
      };
    } catch (error: any) {
      const errorMessage = error.error || "There was an error";
      console.error(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  return { addSubscriber };
};
