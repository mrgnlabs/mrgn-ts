export type ConvertKitProps = {
  email: string;
  name: string;
  projectName: string;
  projectLink: string;
  projectDesc: string;
};

export const submitConvertKit = async (
  data: ConvertKitProps
): Promise<{
  success: boolean;
  message?: string;
}> => {
  "use server";

  const apiKey = process.env.CONVERTKIT_API_KEY;
  const formId = process.env.CONVERTKIT_FORM_ID;

  if (!apiKey || !formId) {
    console.error("ConvertKit API key and / or form ID is missing.");
    return {
      success: false,
      message: "ConvertKit API key and / or form ID is missing.",
    };
  }

  try {
    const response = await fetch(`https://api.convertkit.com/v3/forms/${formId}/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        api_key: apiKey,
        email: data.email,
        fields: {
          name: data.name,
          project_name: data.projectName,
          project_link: data.projectLink,
          project_description: data.projectDesc,
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
