import { SAMPLE_PROMPTS, dispatchMarginfiAction } from "@mrgnlabs/omni-common";
import { FC, useCallback, useMemo, useState } from "react";
import { SafeAreaView, View, Text, TextInput, Image } from "react-native";
import axios from "axios";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { useBanks, useJupiterApiContext, useUserAccounts, useXnftProvider } from "~context";
import tw from "~tw";
import { API_ENDPOINT } from "~config";

const MIN_PROMPT_HEIGHT = 60;

interface ConversationLine {
  text: string;
  isBot: boolean;
}

const HomePage = () => {
  const { wallet } = useXnftProvider();
  const { extendedBankInfos, selectedAccount } = useUserAccounts();
  const { reload: reloadBanks } = useBanks();
  const jupiter = useJupiterApiContext();

  const [prompt, setPrompt] = useState<string>("");
  const [conversation, setConversation] = useState<ConversationLine[]>([]);
  const [thinking, setThinking] = useState<boolean>(false);
  const [transacting, setTransacting] = useState<boolean>(false);
  const [transactionFailed, setTransactionFailed] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);
  const [textInputHeight, setTextInputHeight] = useState(MIN_PROMPT_HEIGHT);

  const samplePrompt = useMemo(() => {
    return SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];
  }, []);

  // Handle form submission for API call
  const handleSubmit = async (e: any) => {
    if (!prompt || thinking || !(e.metaKey || e.ctrlKey) || e.key !== "Enter") return;

    e.preventDefault();

    if (!wallet?.publicKey) return;

    e.currentTarget.blur();
    setFailed(false);
    setThinking(true);
    setConversation((conversation) => [...conversation, { isBot: false, text: prompt }]);
    setPrompt("");

    try {
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
      setConversation((conversation) => [...conversation, { isBot: true, text: botResponse }]);
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
      setConversation((conversation) => [
        ...conversation,
        { isBot: true, text: "Sorry, I was helping Polygon catch up. Please try again." },
      ]);
      setFailed(true);
    }
  };

  const calculatePromptHeight = useCallback((prompt: string) => {
    let numberOfLineBreaks = (prompt.match(/\n/g) || []).length;
    let newHeight = MIN_PROMPT_HEIGHT + numberOfLineBreaks * 28; // min-height + lines x line-height
    return newHeight;
  }, []);

  return (
    <SafeAreaView style={tw`h-screen flex flex-col w-full bg-[#121619]`}>
      <Header />
      <View style={tw`flex-grow w-full`}>
        {conversation.map((line, index) =>
          line.isBot ? (
            <BotLine key={index} text={line.text} thinking={false} />
          ) : (
            <UserLine key={index} text={line.text} />
          )
        )}
        {thinking && <BotLine text="Thinking..." thinking={true} />}
      </View>
      <View style={tw`w-full p-[8px]`}>
        <TextInput
          clearButtonMode="unless-editing"
          selectionColor={"transparent"}
          placeholder={samplePrompt}
          onKeyPress={handleSubmit}
          multiline
          textAlign="center"
          textAlignVertical="center"
          placeholderTextColor={"#888"}
          onChangeText={(prompt) => {
            setTextInputHeight(calculatePromptHeight(prompt));
            setPrompt(prompt);
          }}
          value={prompt}
          style={{
            //@ts-ignore
            outline: "none",
            ...tw`block h-full w-full p-[12px] border-solid border-gray-600 bg-[#202225] !outline-none rounded text-white text-xl italic`,
            height: textInputHeight,
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const Header = () => {
  const { wallet } = useXnftProvider();
  return (
    <View style={tw`w-full h-[60px] flex-row justify-between items-center p-4 pr-[100px] bg-[#0E1113]`}>
      <Image style={tw`w-[35px] h-[30px]`} source={require("../../assets/marginfi_logo.png")} alt="marginfi logo" />
      {wallet && <Text style={tw`text-white text-xl font-bold`}>{shortenAddress(wallet.publicKey)}</Text>}
    </View>
  );
};

const UserLine: FC<{ text: string }> = ({ text }) => (
  <View style={tw`flex flex-row items-center w-full min-h-[60px] p-[8px] pl-[25px] bg-transparent`}>
    <Text style={tw`text-white text-xl`}>{text}</Text>
  </View>
);

const BotLine: FC<{ text: string; thinking: boolean }> = ({ text, thinking }) => (
  <View style={tw`flex flex-row items-center w-full min-h-[60px] p-[8px] pl-[20px] bg-[#4E4E4E30] overflow-y-auto`}>
    <View style={tw`flex flex-col items-start h-full`}>
      <Image style={tw`w-[35px] h-[35px]`} source={require("../../assets/orb.png")} alt="omni orb logo" />
    </View>
    <Text style={tw`text-white text-xl pl-[20px]`}>{thinking ? "..." : text}</Text>
  </View>
);

export { HomePage };
