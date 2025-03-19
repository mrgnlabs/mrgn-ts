import Image from "next/image";

export function ImageComponent({ src, isBig = true, alt }: { src: string; isBig?: boolean; alt: string }) {
    const imageSize = isBig ? 700 : 400;

    return (
        <>
            <Image 
                src={src}
                height={imageSize}
                width={imageSize}
                alt={alt}
            />
        </>
    );
}
