import { Router } from './router.js'
import { createMemo } from '../state/signal.js'

export function usePathname() {
    return Router.instance.getPathname;
}

export function useSearchParams() {
    return Router.instance.getSearchParams;
}

export function useHash() {
    return Router.instance.getHash;
}

export function useSearchParam(key) {
    return createMemo(() => Router.instance.getSearchParam(key));
}

export function useNavigate() {
    return (path, replace = false) => Router.instance.navigate(path, replace);
}

