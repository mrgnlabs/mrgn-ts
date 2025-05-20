// ------- Next helpers

import { IncomingMessage } from "http";
import { PreviewData } from "next";

export declare type Env = {
  [key: string]: string | undefined;
};

export interface NextApiRequest<T> extends IncomingMessage {
  /**
   * Object of `query` values from url
   */
  query: Partial<{
    [key: string]: string | string[];
  }>;
  /**
   * Object of `cookies` from header
   */
  cookies: Partial<{
    [key: string]: string;
  }>;
  body: T;
  env: Env;
  preview?: boolean;
  /**
   * Preview data set on the request, if any
   * */
  previewData?: PreviewData;
}
