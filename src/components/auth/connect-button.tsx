'use client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

export function ConnectButton() {
  const { user, setShowAuthFlow } = useDynamicContext();

  if (!user) {
    return (
      <button
        onClick={() => setShowAuthFlow(true)}
        className="bg-white/10 hover:bg-white/20 text-white rounded-full px-4 py-2 text-sm font-medium transition-colors"
      >
        Sign in
      </button>
    );
  }

  const label = user.email ?? user.firstName ?? 'Connected';

  return (
    <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
      <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
      <span className="text-white text-sm font-medium">{label}</span>
    </div>
  );
}
