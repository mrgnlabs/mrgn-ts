export type submitConvertKitProps = {
  formId: string;
  name: string;
  email: string;
  [key: string]: string;
};

export const submitConvertKit = async (
  data: submitConvertKitProps
): Promise<{
  success: boolean;
  message?: string;
}> => {
  "use server";

  const apiKey = process.env.CONVERTKIT_API_KEY;

  if (!apiKey || !data.formId) {
    console.error("ConvertKit API key and / or form ID is missing.");
    return {
      success: false,
      message: "ConvertKit API key and / or form ID is missing.",
    };
  }

  if (!data.name || !data.email) {
    console.error("Name and / or email is missing.");
    return {
      success: false,
      message: "Name and / or email is missing.",
    };
  }

  const customFields = Object.entries(data).filter(([key]) => !["formId", "name", "email"].includes(key));
  console.log("customFields", customFields);

  try {
    const response = await fetch(`https://api.convertkit.com/v3/forms/${data.formId}/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        api_key: apiKey,
        email: data.email,
        fields: {
          name: data.name,
          ...Object.fromEntries(customFields),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to subscribe: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("Subscription successful:", result);

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("Error subscribing to ConvertKit:", error);
    return {
      success: false,
      message: error.message || undefined,
    };
  }
};
