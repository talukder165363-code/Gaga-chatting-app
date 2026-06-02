import { useModeration } from './useModeration';

// Simple client-side heuristics for spam detection (placeholder)
export function useSafety() {
  const { reportAbuse } = useModeration();

  const isLikelySpam = (content: string) => {
    if (!content) return false;
    const urlCount = (content.match(/https?:\/\//g) || []).length;
    const uppercaseRatio = (content.replace(/[^A-Z]/g, '').length) / Math.max(1, content.length);
    const repeatedChars = /(.)\1{6,}/.test(content);
    // heuristics: many links, too many uppercase, or long repeated chars
    return urlCount >= 2 || uppercaseRatio > 0.6 || repeatedChars;
  };

  const reportMessage = async (messageId: string, content: string, reason = 'spam') => {
    // In a real app we'd POST to backend with messageId/context
    const res = await reportAbuse(messageId, `auto:${reason} - ${content.slice(0, 200)}`);
    return res;
  };

  const detectFraud = (content: string) => {
    // placeholder: detect common fraud keywords
    const fraudKeywords = ['transfer', 'bank', 'ssn', 'password', 'account number', 'wire'];
    const lower = content.toLowerCase();
    return fraudKeywords.some((k) => lower.includes(k));
  };

  return { isLikelySpam, reportMessage, detectFraud };
}

export type { };
