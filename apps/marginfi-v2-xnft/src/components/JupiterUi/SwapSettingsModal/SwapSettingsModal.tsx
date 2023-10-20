import React, { useMemo, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Controller, useForm } from "react-hook-form";
import Decimal from "decimal.js";

import * as icons from "~/assets/icons";
import tw from "~/styles/tailwind";
import { useSwapContext } from "~/context";
import { DEFAULT_SLIPPAGE, PRIORITY_HIGH, PRIORITY_MAXIMUM_SUGGESTED, PRIORITY_NONE, PRIORITY_TURBO } from "~/consts";
import { NumberInput, PrimaryButton } from "~/components/Common";

import SwapSettingButton from "./SwapSettingButton";

const Separator = () => <View style={tw`my-4 border-b border-white/10`} />;

export type Forms = {
  slippagePreset?: string;
  slippageInput?: string;
  priorityPreset?: string;
  priorityInSOLInput?: string;
  priorityInSOLPreset?: string;
};

const MINIMUM_SLIPPAGE = 0;
const MAXIMUM_SLIPPAGE = 50; // 50%
const MINIMUM_SUGGESTED_SLIPPAGE = 0.05; // 0.05%
const MAXIMUM_SUGGESTED_SLIPPAGE = 10; // 10%

export const PRIORITY_TEXT = {
  [PRIORITY_NONE]: `Normal`,
  [PRIORITY_HIGH]: `High`,
  [PRIORITY_TURBO]: `Turbo`,
};

const PRIORITY_PRESET: number[] = [PRIORITY_NONE, PRIORITY_HIGH, PRIORITY_TURBO];

export const SetSlippage: React.FC<{ closeModal: () => void }> = ({ closeModal }) => {
  const {
    jupiter: { priorityFeeInSOL, setPriorityFeeInSOL, slippage, setSlippage },
  } = useSwapContext();

  const SLIPPAGE_PRESET = useMemo(() => ["0.1", String(DEFAULT_SLIPPAGE), "1.0"], [DEFAULT_SLIPPAGE]);

  const slippageInitialPreset = useMemo(() => {
    return SLIPPAGE_PRESET.find((preset) => Number(preset) === slippage);
  }, [slippage, SLIPPAGE_PRESET]);

  const priorityInitialPreset = useMemo(() => {
    return PRIORITY_PRESET.find((preset) => Number(preset) === priorityFeeInSOL);
  }, [priorityFeeInSOL]);

  const form = useForm<Forms>({
    defaultValues: {
      ...(slippage
        ? slippageInitialPreset
          ? {
              slippagePreset: String(slippageInitialPreset),
            }
          : {
              slippageInput: String(slippage),
            }
        : {}),
      ...(typeof priorityFeeInSOL !== "undefined" && typeof priorityInitialPreset !== "undefined"
        ? {
            priorityInSOLPreset: String(priorityInitialPreset),
          }
        : {
            priorityInSOLInput: String(priorityFeeInSOL),
          }),
    },
  });

  /* SLIPPAGE */
  const [inputFocused, setInputFocused] = useState(!slippageInitialPreset);

  const slippageInput = form.watch("slippageInput");
  const slippagePreset = form.watch("slippagePreset");
  const isWithinSlippageLimits = useMemo(() => {
    return Number(slippageInput) >= MINIMUM_SLIPPAGE && Number(slippageInput) <= MAXIMUM_SLIPPAGE;
  }, [slippageInput]);

  const slippageSuggestionText = useMemo(() => {
    if (Number(slippageInput) <= MINIMUM_SUGGESTED_SLIPPAGE) {
      return <span>Your transaction may fail</span>;
    }

    if (Number(slippageInput) >= MAXIMUM_SUGGESTED_SLIPPAGE) {
      return <span>Warning, slippage is high</span>;
    }
    return "";
  }, [slippageInput]);

  const inputRef = useRef<HTMLInputElement>();
  /* END OF SLIPPAGE */

  /* PRIORITY FEE */
  const [inputPriorityFocused, setInputPriorityFocused] = useState(typeof priorityInitialPreset === "undefined");

  const priorityInSOLPreset = form.watch("priorityInSOLPreset");
  const priorityInSOLInput = form.watch("priorityInSOLInput");
  const isWithinPriorityLimits = useMemo(() => {
    return Number(priorityInSOLInput) <= PRIORITY_MAXIMUM_SUGGESTED;
  }, [priorityInSOLInput]);

  const inputPriorityFocusedStyles = useMemo(() => {
    return inputPriorityFocused ? tw` relative mt-1 v2-border-gradient v2-border-gradient-center` : tw`relative mt-1`;
  }, [inputPriorityFocused]);
  /* END OF PRIORITY FEE */

  const isDisabled = (() => {
    const isSlippageDisabled = (() => {
      if (inputFocused && !slippageInput) return true;
      if (slippagePreset) return false;
      else return !isWithinSlippageLimits;
    })();

    const isPriorityInputDisabled = (() => {
      if (inputPriorityFocused && !priorityInSOLInput) return true;
      if (typeof priorityInSOLPreset !== "undefined") return false;
      else return !isWithinPriorityLimits;
    })();

    return isSlippageDisabled || isPriorityInputDisabled;
  })();

  const onClickSave = () => {
    if (isDisabled) return;

    const slippage = Number(slippageInput ?? slippagePreset);
    if (typeof slippage === "number") {
      setSlippage(slippage);
    }

    const priority = Number(priorityInSOLInput ?? priorityInSOLPreset);
    if (typeof priority === "number") {
      setPriorityFeeInSOL(priority);
    }

    closeModal();
  };

  return (
    <View style={tw`w-full rounded-xl flex flex-col bg-jupiter-bg text-white shadow-xl max-h-[90%]`}>
      <View style={tw`flex flex-row justify-between items-center p-4 border-b border-white/10`}>
        <Text style={tw`text-base font-semibold text-primary`}>Swap Settings</Text>
        <Pressable style={tw`text-primary`} onPress={() => closeModal()}>
          <icons.CloseIcon width={14} height={14} color="white" />
        </Pressable>
      </View>

      <View style={tw`relative w-full overflow-y-auto webkit-scrollbar`}>
        <View>
          <View style={tw`mt-2 px-5`}>
            {/**************************** PRIORTY *****************************/}
            <Text style={tw`flex items-center text-sm text-primary font-semibold`}>Transaction Priority</Text>

            <View style={tw`flex flex-row items-center mt-2.5 rounded-xl ring-1 ring-white/5 overflow-hidden`}>
              <Controller
                name="priorityInSOLInput"
                control={form.control}
                render={({}) => {
                  return (
                    <>
                      {PRIORITY_PRESET.map((item, idx) => {
                        const name = PRIORITY_TEXT[item as keyof typeof PRIORITY_TEXT];
                        return (
                          <SwapSettingButton
                            key={idx}
                            idx={idx}
                            itemsCount={PRIORITY_PRESET.length}
                            roundBorder={idx === 0 ? "left" : idx === SLIPPAGE_PRESET.length - 1 ? "right" : undefined}
                            highlighted={!inputPriorityFocused && Number(priorityInSOLPreset) === item}
                            onClick={() => {
                              form.setValue("priorityInSOLPreset", item.toString());
                              form.setValue("priorityInSOLInput", undefined);
                              setInputPriorityFocused(false);
                            }}
                          >
                            <View style={tw`my-16px`}>
                              <Text style={tw`text-sm m-0 text-primary`}>{name}</Text>
                              <Text style={tw`mt-1 text-xs text-secondary`}>{item} SOL</Text>
                            </View>
                          </SwapSettingButton>
                        );
                      })}
                    </>
                  );
                }}
              />
            </View>

            <View style={tw`mt-1`}>
              <Text style={tw`text-secondary font-medium text-xs my-4px`}>or set manually:</Text>

              <View style={inputPriorityFocusedStyles}>
                <Controller
                  name={"priorityInSOLInput"}
                  control={form.control}
                  render={({ field: { onChange, value } }) => {
                    return (
                      <NumberInput
                        min={0}
                        max={0.01}
                        amount={typeof value === "undefined" ? "" : value.toString()}
                        decimals={9}
                        onValueChange={(value) => {
                          onChange(value);
                          if (typeof value !== "undefined") {
                            form.setValue("priorityInSOLPreset", undefined);
                          }
                        }}
                      />
                    );
                  }}
                />
                <Text style={tw`absolute right-4 top-3 text-sm text-secondary`}>SOL</Text>
              </View>

              <View>
                {typeof priorityInSOLPreset === "undefined" && priorityInSOLInput !== "0" ? (
                  <Text style={tw`text-xs text-secondary my-4px`}>
                    This will cost an additional {new Decimal(priorityInSOLInput || 0).toString()} SOL.
                  </Text>
                ) : null}
              </View>
            </View>

            <Separator />
            {/**************************** SLIPPAGE *****************************/}
            <Text style={tw`flex flex-row items-center text-sm text-primary font-medium`}>Slippage Settings</Text>

            <View
              style={tw`flex flex-row items-center mt-2.5 rounded-xl ring-1 ring-white/5 overflow-hidden text-sm h-[52px]`}
            >
              <Controller
                name="slippagePreset"
                control={form.control}
                render={({ field: { onChange, value } }) => {
                  return (
                    <>
                      {SLIPPAGE_PRESET.map((item, idx) => {
                        const displayText = Number(item) + "%";

                        return (
                          <SwapSettingButton
                            key={idx}
                            idx={idx}
                            itemsCount={SLIPPAGE_PRESET.length}
                            className="h-full"
                            roundBorder={idx === 0 ? "left" : undefined}
                            highlighted={!inputFocused && Number(value) === Number(item)}
                            onClick={() => {
                              onChange(item);
                              setInputFocused(false);
                              form.setValue("slippageInput", undefined);
                            }}
                          >
                            <Text style={tw`text-secondary mt-2px`}>{displayText}</Text>
                          </SwapSettingButton>
                        );
                      })}
                    </>
                  );
                }}
              />

              <Pressable
                onPress={() => setInputFocused(true)}
                style={tw`flex flex-row items-center justify-between cursor-text w-[120px] h-full text-white/50 bg-[#1B1B1E] pl-2 text-sm relative border-l border-black-10 border-white/5`}
              >
                <Text style={tw`text-xs text-secondary mt-2px`}>Custom</Text>

                <Controller
                  name={"slippageInput"}
                  control={form.control}
                  render={({ field: { onChange, value } }) => (
                    <NumberInput
                      min={0}
                      max={50}
                      amount={typeof value === "undefined" ? "" : value}
                      decimals={2}
                      onValueChange={(value) => {
                        onChange(value);
                        if (typeof value !== "undefined") {
                          form.setValue("slippagePreset", undefined);
                        }
                      }}
                      hasBorder={false}
                    />
                  )}
                />
              </Pressable>
            </View>
          </View>

          <View style={tw`px-5 pb-5 mt-5`}>
            <PrimaryButton title={"Save Settings"} isDisabled={isDisabled} onPress={() => onClickSave()} />
          </View>
        </View>
      </View>
    </View>
  );
};
