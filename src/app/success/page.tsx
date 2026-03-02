"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    // Poll for purchase confirmation
    let attempts = 0;
    const maxAttempts = 20;

    const poll = async () => {
      try {
        const res = await fetch("/api/grid");
        if (res.ok) {
          setStatus("success");
          return;
        }
      } catch {
        // ignore
      }
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        setStatus("success"); // Assume success after timeout
      }
    };

    // Short delay then check
    setTimeout(poll, 1500);
  }, [sessionId]);

  const shareText = encodeURIComponent(
    "I just claimed my spot on VibeGrid! The Million Dollar Homepage for vibe coders. Claim yours: "
  );
  const shareUrl = encodeURIComponent(
    process.env.NEXT_PUBLIC_BASE_URL || "https://vibegrid.com"
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] p-4">
      <div className="max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <div className="w-12 h-12 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Processing payment...
            </h1>
            <p className="text-gray-400">
              Your spot is being claimed on the grid.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center border border-green-500/20">
              <svg
                className="w-8 h-8 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              You&apos;re on the grid!
            </h1>
            <p className="text-gray-400 mb-8">
              Your spot has been claimed. Welcome to VibeGrid.
            </p>

            <div className="space-y-3">
              <a
                href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Share on X
              </a>
              <Link
                href="/"
                className="block w-full py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
              >
                View the Grid
              </Link>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-400 mb-6">
              We couldn&apos;t verify your payment. If you were charged, your
              spot will appear on the grid shortly.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
            >
              Back to Grid
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#030712]">
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
