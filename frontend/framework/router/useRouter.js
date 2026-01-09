import { Router } from './router.js';
import { createMemo } from '../state/signal.js';

export const usePathname = () => {
    return Router.instance.getPathname;
}

export const useSearchParams = () => {
    return Router.instance.getSearchParams;
}

export const useHash = () => {
    return Router.instance.getHash;
}

export const useSearchParam = (key) => {
    return createMemo(() => Router.instance.getSearchParam(key));
}

export const useNavigate = () => {
    return (path, replace = false) => Router.instance.navigate(path, replace);
}
