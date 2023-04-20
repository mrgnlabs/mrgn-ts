import axios from 'axios';

interface HandlePromptSubmitParams {
    input: string;
    walletPublicKey?: string;
    onBeforeSubmit: () => void;
    onSubmitSuccess: (data: any) => void;
    onSubmitError: () => void;
    onActionStart: () => void;
    onActionEnd: (error: boolean) => void;
    action: (data: any) => Promise<boolean>;
    url: string;
}

const handlePromptSubmit = async ({
    input,
    walletPublicKey,
    onBeforeSubmit,
    onSubmitSuccess,
    onSubmitError,
    onActionStart,
    onActionEnd,
    action,
    url,
}: HandlePromptSubmitParams) {
  onBeforeSubmit();

  try {
    const res = await axios.post(url, {
      input,
      walletPublicKey,
    });

    onSubmitSuccess(res.data);

    if (res.data.data) {
      onActionStart();
      const actionSuccess = await action({ ...res.data.data });
      onActionEnd(!actionSuccess);
    }
  } catch (error) {
    console.error("Error calling API route:", error);
    onSubmitError();
  }
}

export { handlePromptSubmit };
