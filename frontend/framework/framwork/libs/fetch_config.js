export async function getDevMode() {
  const resp = await fetch("/framwork/package.json");
  const data = await resp.json();
  return data.devMode;
}