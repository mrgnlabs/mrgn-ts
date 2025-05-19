import axios, { type AxiosResponse } from "axios";
import axiosRetry from "axios-retry";
import type {
  ComputerAssetResponse,
  ComputerFeeResponse,
  ComputerInfoResponse,
  ComputerNonceResponse,
  ComputerSystemCallResponse,
  ComputerUserResponse,
  ComputerStorageResponse,
} from "./computer.types";
import { HOST } from "./constants";

axios.defaults.headers.post["Content-Type"] = "application/json";

export const initComputerClient = (responseCallback?: (e: any) => void) => {
  const ins = axios.create({
    baseURL: HOST,
    timeout: 1000 * 60 * 10,
  });

  ins.interceptors.response.use(async (res: AxiosResponse) => {
    return res.data;
  });

  ins.interceptors.response.use(undefined, async (e: any) => {
    if (!e.response) return undefined;
    if (e.response.status === 404) return undefined;
    responseCallback?.(e);
    return Promise.reject(e);
  });

  axiosRetry(ins, {
    retries: 5,
    shouldResetTimeout: true,
    retryDelay: () => 500,
  });

  return {
    fetchInfo: (): Promise<ComputerInfoResponse> => ins.get("/"),
    fetchUser: (mix: string): Promise<ComputerUserResponse> => ins.get(`/users/${mix}`),
    fetchAssets: (): Promise<ComputerAssetResponse[]> => ins.get("/deployed_assets"),
    fetchCall: (id: string): Promise<ComputerSystemCallResponse> => ins.get(`/system_calls/${id}`),

    deployAssets: (assets: string[]) => ins.post("/deployed_assets", { assets }),
    getNonce: (mix: string): Promise<ComputerNonceResponse> => ins.post("/nonce_accounts", { mix }),
    getFeeOnXin: (amount: string): Promise<ComputerFeeResponse> => ins.post("/fee", { sol_amount: amount }),
  };
};
