import React from "react";
import Link from "next/link";
import { IconAlertTriangle, IconExternalLink } from "@tabler/icons-react";

export const Maintenance = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div className="absolute inset-0 bg-gradient-radial from-[#101212] via-[#090a0a] to-[#090a0a]" />

      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center max-w-xl mx-auto">
        {/* Icon */}
        <div className="mb-8 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 blur-xl bg-chartreuse/20 rounded-full" />
            <IconAlertTriangle className="relative h-20 w-20 text-chartreuse" strokeWidth={1.5} />
          </div>
        </div>

        {/* Main heading */}
        <h1 className="text-4xl md:text-5xl font-medium text-white mb-4">Under Maintenance</h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-muted-foreground mb-8">
          We&apos;re performing scheduled maintenance. We&apos;ll be back shortly.
        </p>

        {/* Divider */}
        <div className="w-24 h-px bg-chartreuse/40 mb-8" />

        {/* Project 0 CTA */}
        <div className="bg-secondary/50 backdrop-blur-sm border border-border rounded-lg p-6 w-full max-w-md">
          <p className="text-muted-foreground mb-4">Need to manage your positions?</p>
          <Link
            href="https://app.0.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-chartreuse text-black font-medium px-6 py-3 rounded-lg hover:bg-chartreuse/90 transition-colors"
          >
            Go to Project 0
            <IconExternalLink className="h-4 w-4" />
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-12 text-sm text-muted-foreground/60">Thank you for your patience.</p>
      </div>
    </div>
  );
};

export default Maintenance;
