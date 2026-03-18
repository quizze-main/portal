import React, { useEffect, useState } from "react";

type YandexFormEmbedProps = {
  formUrl: string;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
};

export const YandexFormEmbed: React.FC<YandexFormEmbedProps> = ({
  formUrl,
  className,
  minHeight = 500,
  maxHeight = 2000,
}) => {
  const [height, setHeight] = useState<number>(Math.max(minHeight, Math.min(window.innerHeight, maxHeight)));

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const allowedOrigin = "https://forms.yandex.ru";
      if (!event.origin.startsWith(allowedOrigin)) return;
      const data = event.data as unknown as { type?: string; height?: number };
      if (data && data.type === "embed-size" && typeof data.height === "number") {
        setHeight(Math.max(minHeight, Math.min(data.height, maxHeight)));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [minHeight, maxHeight]);

  return (
    <iframe
      src={formUrl}
      title="Yandex Form"
      className={className}
      style={{ width: "100%", height, border: 0 }}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation"
    />
  );
};

export default YandexFormEmbed;


