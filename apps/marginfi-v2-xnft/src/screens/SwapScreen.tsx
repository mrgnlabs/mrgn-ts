import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Modal, StyleSheet } from "react-native";

import tw from "~/styles/tailwind";

import { Screen } from "~/components/Common";
import {
  SwapForm,
  PriceInfo,
  SetSlippage,
  FormPairSelector,
  ReviewOrderModal,
  ConfirmOrderModal,
} from "~/components/JupiterUi";
import { TokenInfo } from "@solana/spl-token-registry/dist/main/lib/tokenlist";
import { IForm, useSwapContext } from "~/context";
import { WSOL_MINT } from "~/config";
import { PublicKey } from "@solana/web3.js";
import { useJupiterStore, useMrgnlendStore } from "~/store/store";

export function SwapScreen() {
  const [showRouteSelector, setShowRouteSelector] = useState<boolean>(false);
  const [selectPairSelector, setSelectPairSelector] = useState<"fromMint" | "toMint" | null>(null);
  const [showUnknownToken, setShowUnknownToken] = useState<TokenInfo | null>(null);
  const [tokenMap, tokenAccountMap] = useJupiterStore((state) => [state.tokenMap, state.tokenAccountMap]);

  const {
    form,
    setForm,
    setErrors,
    quoteReponseMeta,
    onSubmit: onSubmitJupiter,
    formProps: { initialOutputMint, fixedOutputMint },
    jupiter: { loading },
  } = useSwapContext();

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const [isDisabled, setIsDisabled] = useState(false);

  const [nativeSolBalance] = useMrgnlendStore((state) => [state.nativeSolBalance]);

  const balance = useMemo(() => {
    return form.fromMint
      ? new PublicKey(form.fromMint).equals(WSOL_MINT)
        ? nativeSolBalance
        : tokenAccountMap.get(form.fromMint)?.balance ?? 0
      : 0;
  }, [tokenAccountMap, nativeSolBalance, form.fromMint]);

  useEffect(() => {
    if (!form.fromValue || !form.fromMint || !form.toMint || !form.toValue || !quoteReponseMeta || loading) {
      setErrors({});
      setIsDisabled(true);
      return;
    }

    if (Number(form.fromValue) > balance) {
      setErrors({
        fromValue: { title: "Insufficient balance", message: "" },
      });
      setIsDisabled(true);
      return;
    }

    setErrors({});
    setIsDisabled(false);
  }, [form, balance]);

  const submitTokenSwap = () => {
    setShowReviewModal(false);
    setShowConfirmModal(true);
    onSubmitJupiter();
  };

  const onSelectMint = useCallback(
    (tokenInfo: TokenInfo, approved: boolean = false) => {
      const isUnknown = tokenInfo.tags?.length === 0;
      if (isUnknown && approved === false) {
        setShowUnknownToken(tokenInfo);
        return;
      }

      if (selectPairSelector === "fromMint") {
        setForm((prev: IForm) => ({
          ...prev,
          fromMint: tokenInfo.address,
          fromValue: "",

          // Prevent same token to same token;
          ...(prev.toMint === tokenInfo.address ? { toMint: prev.fromMint } : undefined),
        }));
      } else {
        setForm((prev: IForm) => ({
          ...prev,
          toMint: tokenInfo.address,
          toValue: "",

          // Prevent same token to same token;
          ...(prev.fromMint === tokenInfo.address ? { fromMint: prev.toMint } : undefined),
        }));
      }
      setSelectPairSelector(null);
    },
    [selectPairSelector]
  );

  const availableMints: TokenInfo[] = useMemo(() => {
    let result = [...tokenMap.values()];
    // On fixedOutputMint, prevent user from selecting the same token as output
    if (fixedOutputMint) {
      result = result.filter((item) => item.address !== initialOutputMint);
    }

    return result;
  }, [tokenMap, fixedOutputMint, initialOutputMint]);

  const onSubmitToConfirmation = useCallback(() => {
    // setScreen('Confirmation');
  }, []);

  return (
    <Screen>
      <View style={tw`mx-auto max-w-420px w-full p-10px`}>
        <Text style={tw`text-[#fff] text-xl text-center my-10px`}>
          Zero fees. <Text style={tw`text-[#DCE85D]`}>Always.</Text>
        </Text>
        <SwapForm
          onSubmit={() => setShowReviewModal(true)}
          isDisabled={isDisabled}
          setSelectPairSelector={setSelectPairSelector}
          setShowRouteSelector={(toggle: boolean) => setShowRouteSelector(toggle)}
          setShowSettingsModal={() => setShowSettingsModal(!showSettingsModal)}
        />

        <Modal
          animationType="slide"
          transparent={true}
          visible={showSettingsModal}
          onRequestClose={() => {
            setShowSettingsModal(false);
          }}
        >
          <View style={styles.centeredView}>
            <View style={[styles.modalView, tw`bg-[#1C2125]`]}>
              <SetSlippage closeModal={() => setShowSettingsModal(false)} />
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={selectPairSelector !== null}
          onRequestClose={() => {
            setSelectPairSelector(null);
          }}
        >
          <View style={styles.centeredView}>
            <View style={[styles.modalView, tw`bg-[#1C2125]`]}>
              <FormPairSelector
                onSubmit={onSelectMint}
                tokenInfos={availableMints}
                onClose={() => setSelectPairSelector(null)}
              />
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={showReviewModal}
          onRequestClose={() => {
            setShowReviewModal(false);
          }}
        >
          <View style={styles.centeredView}>
            <View style={[styles.modalView, tw`bg-[#1C2125]`]}>
              <ReviewOrderModal onClose={() => setShowReviewModal(false)} onSubmit={() => submitTokenSwap()} />
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={showConfirmModal}
          onRequestClose={() => {
            setShowConfirmModal(false);
          }}
        >
          <View style={styles.centeredView}>
            <View style={[styles.modalView, tw`bg-[#1C2125]`]}>
              <ConfirmOrderModal onClose={() => setShowConfirmModal(false)} />
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    marginHorizontal: 5,
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    width: "100%",
    maxWidth: 420,
    padding: 3,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: "#F194FF",
  },
  buttonClose: {
    backgroundColor: "#2196F3",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
  },
});
