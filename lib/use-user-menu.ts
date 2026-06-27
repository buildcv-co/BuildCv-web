import { useEffect, useState } from "react";
import { getSession } from "@/lib/api/session";

export type UserMenuStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated";

export interface UserMenuState {
  readonly status: UserMenuStatus;
  readonly user: { readonly email: string; readonly name: string } | null;
}

const INITIAL_STATE: UserMenuState = {
  status: "loading",
  user: null,
};

export function useUserMenu(): UserMenuState {
  const [state, setState] = useState<UserMenuState>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await getSession();
        if (cancelled) return;
        if (session) {
          setState({
            status: "authenticated",
            user: {
              email: session.user.email,
              name: session.user.name,
            },
          });
        } else {
          setState({ status: "unauthenticated", user: null });
        }
      } catch {
        if (cancelled) return;
        setState({ status: "unauthenticated", user: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
