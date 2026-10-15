import { useCallback, useState } from "react";
import { Toast } from "../ui/Toast";

// Toast (MO1B-019: the business toast, BizMoreV8 shape)

export function useBizToast(): [React.ReactNode, (message: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  const [n, setN] = useState(0);
  const show = useCallback((m: string) => {
    setMsg(m);
    setN((k) => k + 1);
  }, []);
  const node = <Toast key={n} open={!!msg} message={msg ?? ""} variant="business" shape="more" onExpire={() => setMsg(null)} />;
  return [node, show];
}
