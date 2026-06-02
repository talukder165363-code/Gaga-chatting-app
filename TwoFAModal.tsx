import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAccountSecurity } from '@/hooks/useAccountSecurity';

export default function TwoFAModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const { startEnable2FA, verify2FA, twoFAEnabled } = useAccountSecurity();

  if (!isOpen) return null;

  const sendCode = async () => {
    setSending(true);
    await startEnable2FA();
    setSending(false);
    alert('A verification code was (simulated) sent. Use code 000000 to enable.');
  };

  const handleVerify = async () => {
    const res = await verify2FA(code);
    if (res.success) {
      alert('2FA enabled');
      onClose();
    } else {
      alert('Invalid code');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Two-Factor Authentication</h3>
        <p className="text-sm text-white/60 mb-4">Enable 2FA to add an extra layer of security to your account.</p>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input className="flex-1 rounded px-3 py-2 bg-white/5 text-white" placeholder="Enter code" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button onClick={sendCode} disabled={sending}>{sending ? 'Sending...' : 'Send code'}</Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleVerify}>Verify & Enable</Button>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/50">Current: {twoFAEnabled ? 'Enabled' : 'Disabled'}</p>
      </div>
    </div>
  );
}
