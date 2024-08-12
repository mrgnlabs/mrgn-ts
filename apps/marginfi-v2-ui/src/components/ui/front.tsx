"use client";

import Script from "next/script";
import { env } from "process";

export function FrontChat() {
    return (
        <Script
            id="front-chat-script"
            src="https://chat-assets.frontapp.com/v1/chat.bundle.js"
            onLoad={initFrontChat}
        ></Script>
    );
};

function initFrontChat() {
    //@ts-expect-error
    window.FrontChat("init", {
        chatId: process.env.NEXT_PUBLIC_FRONT_ID,
        useDefaultLauncher: true,
    });
}