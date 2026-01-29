export function For(list, render) {
    return () => {
        const items = list() ?? [];

        if (!Array.isArray(items)) return [];

        return items.map((item, index) => {
            const vnode = render(item, index);

            // enforce stable key
            if (vnode && typeof vnode === "object") {
                vnode.key ??= item?.id ?? index;
            }

            return vnode;
        });
    };
}
