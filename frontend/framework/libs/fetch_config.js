export async function getDevMode() {
  const resp = await fetch("/framework/package.json");
  const data = await resp.json();
  return data.devMode;
}