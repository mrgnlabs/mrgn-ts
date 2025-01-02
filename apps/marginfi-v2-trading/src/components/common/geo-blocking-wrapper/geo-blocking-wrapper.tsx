import React from "react";
import { useRouter } from "next/router";
import { Loader } from "../Loader";

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
      <div className="w-full max-w-8xl mx-auto px-4 pb-16 pt-8 md:pt-14 min-h-[calc(100vh-100px)]">
        {loading && <Loader label="Loading the arena..." className="mt-8" />}
        {geoBlocked && (
          <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-24 text-center">
            <h1 className="text-2xl font-medium">Your region is not allowed in The Arena.</h1>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
