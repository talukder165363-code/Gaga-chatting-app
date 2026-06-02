import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAccountSecurity } from '@/hooks/useAccountSecurity';

export default function PinModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [pin, setPin] = useState('');
  const { setupPin, pinSet } = useAccountSecurity();

  if (!isOpen) return null;

  const handleSetup = async () => {
    if (pin.length < 4) {
      alert('PIN must be at least 4 digits');
      return;
    }
    await setupPin(pin);
    alert('PIN set (simulated)');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Set a PIN</h3>
        <p className="text-sm text-white/60 mb-4">Use a device PIN to quickly unlock the app.</p>
        <div className="space-y-3">
          <input className="w-full rounded px-3 py-2 bg-white/5 text-white" placeholder="Enter PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={handleSetup}>Set PIN</Button>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/50">Current: {pinSet ? 'Set' : 'Not set'}</p>
      </div>
    </div>
  );
}
