import { SAMPLE_PROMPTS, dispatchMarginfiAction } from "@mrgnlabs/omni-common";
import { FormEventHandler, useMemo, useState } from "react";
import { SafeAreaView, View, Text, TextInput } from "react-native";
import axios from "axios";
import { useBanks, useJupiterApiContext, useUserAccounts, useXnftProvider } from "~context";
import tw from "~tw";
import { API_ENDPOINT } from "~config";

const HomePage = () => {
  const { wallet } = useXnftProvider();
  const { extendedBankInfos, selectedAccount } = useUserAccounts();
  const { reload: reloadBanks } = useBanks();
  const jupiter = useJupiterApiContext();

  const [prompt, setPrompt] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [thinking, setThinking] = useState<boolean>(false);
  const [transacting, setTransacting] = useState<boolean>(false);
  const [transactionFailed, setTransactionFailed] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);

  const samplePrompt = useMemo(() => {
    return SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];
  }, []);

  // Handle form submission for API call
  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    if (!wallet?.publicKey) return;

    setFailed(false);
    setResponse("");
    setThinking(true);
    e.preventDefault();

    try {
      console.log({
        input: prompt,
        walletPublicKey: wallet.publicKey?.toBase58(),
      });
      const {
        data: { output: botResponse, error: botError, data: actionDispatchData },
      } = await axios.post(
        `${API_ENDPOINT}/api/ai`,
        {
          input: prompt,
          walletPublicKey: wallet.publicKey?.toBase58(),
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setThinking(false);
      setResponse(botResponse);
      if (botError) {
        setFailed(true);
      }
      if (actionDispatchData) {
        setTransacting(true);
        const actionSuccess = await dispatchMarginfiAction({
          action: actionDispatchData.action,
          amount: actionDispatchData.amount,
          tokenSymbol: actionDispatchData.tokenSymbol,
          marginfiAccount: selectedAccount,
          extendedBankInfos,
          jupiter,
          reloadBanks,
        });
        setTransactionFailed(!actionSuccess);
        setTransacting(false);
      }
    } catch (error) {
      console.error("Error calling API route:", error);
      setResponse("Sorry, I was helping Polygon catch up. Please try again.");
      setFailed(true);
    }
  };

  return (
    <SafeAreaView style={tw`h-full w-full`}>
      <form onSubmit={handleSubmit}>
        <TextInput
          editable
          selectionColor={"transparent"}
          placeholder={samplePrompt}
          placeholderTextColor={"#555"}
          onChangeText={setPrompt}
          value={prompt}
          style={{
            //@ts-ignore
            outline: "none",
            ...tw`w-full p-2 border-solid border-2 border-gray-600 !outline-none`,
          }}
        />
      </form>
      <View style={tw`h-full w-full`}>
        <Text style={tw`h-full w-full`}>{response}</Text>
      </View>
    </SafeAreaView>
  );
};

export { HomePage };
