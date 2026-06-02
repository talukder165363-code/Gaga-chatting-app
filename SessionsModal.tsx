import { Button } from '@/components/ui/button';
import { useAccountSecurity } from '@/hooks/useAccountSecurity';

export default function SessionsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { sessions, signOutSession, signOutAllOther } = useAccountSecurity();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Active Sessions</h3>
        <div className="space-y-3 mb-4">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded p-3 bg-white/5">
              <div>
                <div className="font-semibold">{s.device}</div>
                <div className="text-sm text-white/60">Last active: {new Date(s.lastActive).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                {!s.current && <Button variant="secondary" onClick={() => signOutSession(s.id)}>Sign out</Button>}
                {s.current && <span className="text-sm text-white/50">This device</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={signOutAllOther}>Sign out of other sessions</Button>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
