import React from "react";
import { useRouter } from "next/router";
import { Loader } from "../Loader";
import { motion } from "framer-motion";

import { cn } from "@mrgnlabs/mrgn-utils";
import Link from "next/link";

type GeoBlockingWrapperProps = {
  children: React.ReactNode;
};

export const GeoBlockingWrapper: React.FC<GeoBlockingWrapperProps> = ({ children }) => {
  const [geoBlocked, setGeoBlocked] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const checkGeoBlock = async () => {
      try {
        const res = await fetch(window.location.href, { method: "HEAD" });
        const isBlocked = res.headers.get("x-geo-blocked") === "true";
        setGeoBlocked(isBlocked);
      } catch (error) {
        console.error("Error checking geo-blocking:", error);
      } finally {
        setLoading(false);
      }
    };

    checkGeoBlock();
  }, [router]);

  if (loading || geoBlocked) {
    return (
      <div className="w-full max-w-8xl mx-auto px-4 pb-16 pt-8 md:pt-24 min-h-[calc(100vh-100px)] mrgn-bg-gradient">
        {loading && <Loader label="Loading the arena..." className="mt-8" />}
        {geoBlocked && (
          <div
            className={cn(
              "text-muted-foreground text-base text-center px-2 pt-4 pb-10 md:pt-0 md:px-0 text-primary/80 space-y-5 text-lg md:text-2xl"
            )}
          >
            <motion.h1
              className={cn("text-5xl font-medium text-primary font-orbitron md:text-6xl")}
              initial={{ opacity: true ? 0 : 1 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              Arena Restricted
            </motion.h1>
            <motion.div
              className="max-w-2xl w-full mx-auto"
              initial={{ opacity: true ? 0 : 1 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              The Arena is not available in your region. Please retry from a non-restricted territory or{" "}
              <span className="cursor-pointer underline" onClick={() => window.location.reload()}>
                refresh and try again.
              </span>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
