"use client";

import Script from "next/script";

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
        chatId: "c86592c756d1a370464e15d0ca79cd1f",
        useDefaultLauncher: true,
    });
}